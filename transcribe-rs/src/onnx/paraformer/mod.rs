use ndarray::Array1;
use ort::inputs;
use ort::session::Session;
use ort::value::TensorRef;
use std::path::Path;

use super::session;
use super::Quantization;
use crate::decode::tokens::load_vocab;
use crate::decode::ctc_greedy_decode;
use crate::features::{apply_cmvn, apply_lfr, compute_mel, MelConfig, WindowType};
use crate::TranscribeError;
use crate::{ModelCapabilities, SpeechModel, TranscribeOptions, TranscriptionResult};

const CAPABILITIES: ModelCapabilities = ModelCapabilities {
    name: "Paraformer",
    engine_id: "paraformer",
    sample_rate: 16000,
    languages: &["zh"],
    supports_timestamps: false,
    supports_translation: false,
    supports_streaming: false,
};

struct ParaformerMeta {
    #[allow(dead_code)]
    vocab_size: i32,
    lfr_window_size: usize,
    lfr_window_shift: usize,
    neg_mean: Array1<f32>,
    inv_stddev: Array1<f32>,
}

pub struct ParaformerModel {
    session: Session,
    meta: ParaformerMeta,
    vocab: Vec<String>,
    input_names: Vec<String>,
}

/// Decode BPE tokens with `@@` continuation markers.
///
/// Standard BPE decoding: join with spaces, then remove `@@<space>` markers.
/// This merges subword tokens like `["cour@@", "se"]` into `"course"`.
/// For Chinese text, spaces between CJK characters are removed afterwards.
fn bpe_decode(tokens: &[&str]) -> String {
    let joined = tokens.join(" ");
    let merged = joined.replace("@@ ", "");
    remove_cjk_spaces(merged.trim())
}

/// Remove spaces between adjacent CJK characters (Chinese, Japanese, Korean).
/// Preserves spaces between Latin words and other scripts.
fn remove_cjk_spaces(text: &str) -> String {
    let mut result = String::with_capacity(text.len());
    let chars: Vec<char> = text.chars().collect();
    for i in 0..chars.len() {
        let c = chars[i];
        if c == ' ' && i > 0 && i + 1 < chars.len() {
            let prev = chars[i - 1];
            let next = chars[i + 1];
            if is_cjk(prev) && is_cjk(next) {
                continue;
            }
        }
        result.push(c);
    }
    result
}

fn is_cjk(c: char) -> bool {
    matches!(c,
        '\u{4E00}'..='\u{9FFF}' |
        '\u{3400}'..='\u{4DBF}' |
        '\u{F900}'..='\u{FAFF}' |
        '\u{2F800}'..='\u{2FA1F}' |
        '\u{3000}'..='\u{303F}' |
        '\u{FF00}'..='\u{FFEF}'
    )
}

impl ParaformerModel {
    pub fn load(model_dir: &Path, quantization: &Quantization) -> Result<Self, TranscribeError> {
        let model_path = session::resolve_model_path(model_dir, "model", quantization);
        let tokens_path = model_dir.join("tokens.txt");

        if !model_path.exists() {
            return Err(TranscribeError::ModelNotFound(model_path));
        }
        if !tokens_path.exists() {
            return Err(TranscribeError::ModelNotFound(tokens_path));
        }

        log::info!("Loading Paraformer model from {:?}...", model_path);
        let session = session::create_session_cpu_only(&model_path)?;

        let input_names: Vec<String> = session
            .inputs()
            .iter()
            .map(|i| i.name().to_string())
            .collect();
        log::debug!("Model inputs: {:?}", input_names);

        let vocab_size =
            session::read_metadata_i32(&session, "vocab_size", None)?.ok_or_else(|| {
                TranscribeError::Config("Missing required metadata: vocab_size".into())
            })?;
        let lfr_window_size =
            session::read_metadata_i32(&session, "lfr_window_size", Some(7))?.unwrap() as usize;
        let lfr_window_shift =
            session::read_metadata_i32(&session, "lfr_window_shift", Some(6))?.unwrap() as usize;
        let neg_mean = session::read_metadata_float_vec(&session, "neg_mean")?.unwrap_or_default();
        let inv_stddev =
            session::read_metadata_float_vec(&session, "inv_stddev")?.unwrap_or_default();

        log::info!(
            "Model: vocab_size={}, lfr_window_size={}, lfr_window_shift={}, cmvn_dim={}",
            vocab_size,
            lfr_window_size,
            lfr_window_shift,
            neg_mean.len()
        );

        let (vocab, _blank_idx) = load_vocab(&tokens_path)?;

        Ok(Self {
            session,
            meta: ParaformerMeta {
                vocab_size,
                lfr_window_size,
                lfr_window_shift,
                neg_mean: Array1::from_vec(neg_mean),
                inv_stddev: Array1::from_vec(inv_stddev),
            },
            vocab,
            input_names,
        })
    }

    fn infer(&mut self, samples: &[f32]) -> Result<TranscriptionResult, TranscribeError> {
        let lfr_window_size = self.meta.lfr_window_size;
        let lfr_window_shift = self.meta.lfr_window_shift;
        let has_cmvn = !self.meta.neg_mean.is_empty();
        let neg_mean = self.meta.neg_mean.clone();
        let inv_stddev = self.meta.inv_stddev.clone();

        // 1. Compute 80-dim FBANK with Hamming window and pre-emphasis
        let mel_config = MelConfig {
            sample_rate: 16000,
            num_mels: 80,
            n_fft: 400,
            hop_length: 160,
            window: WindowType::Hamming,
            f_min: 20.0,
            f_max: None,
            pre_emphasis: Some(0.97),
            snip_edges: true,
            normalize_samples: true,
        };
        let features = compute_mel(samples, &mel_config);

        log::debug!(
            "FBANK: [{} x {}]",
            features.nrows(),
            features.ncols()
        );

        // 2. Apply LFR (Low Frame Rate)
        let features = apply_lfr(&features, lfr_window_size, lfr_window_shift);
        log::debug!("After LFR: [{} x {}]", features.nrows(), features.ncols());

        if features.nrows() == 0 {
            return Ok(TranscriptionResult {
                text: String::new(),
                emotion: None,
                event: None,
                segments: None,
            });
        }

        // 3. Apply CMVN
        let mut features = features;
        if has_cmvn {
            apply_cmvn(&mut features, &neg_mean, &inv_stddev);
        }

        // 4. Run ONNX forward pass — model expects (N, T, C)
        let num_feat_frames = features.nrows() as i32;
        let feat_3d = features.insert_axis(ndarray::Axis(0)); // [1, T, C]
        let feat_length = ndarray::arr1::<i32>(&[num_feat_frames]);

        let feat_3d_dyn = feat_3d.into_dyn();
        let feat_len_dyn = feat_length.into_dyn();
        let t_feat = TensorRef::from_array_view(feat_3d_dyn.view())?;
        let t_len = TensorRef::from_array_view(feat_len_dyn.view())?;

        let outputs = if self.input_names.len() >= 2 {
            self.session.run(inputs![
                self.input_names[0].as_str() => t_feat,
                self.input_names[1].as_str() => t_len,
            ])?
        } else {
            self.session.run(inputs![
                self.input_names[0].as_str() => t_feat,
            ])?
        };

        let log_probs = outputs[0].try_extract_array::<f32>()?;
        let log_probs = log_probs.to_owned().into_dimensionality::<ndarray::Ix3>()?;

        log::debug!("Log probs shape: {:?}", log_probs.shape());

        // 5. CTC greedy decode — Paraformer uses blank_id=0
        let num_frames = log_probs.shape()[1] as i64;
        let logits_lengths = vec![num_frames];
        let results = ctc_greedy_decode(&log_probs.view(), &logits_lengths, 0);

        // 6. Convert token IDs to text (BPE with @@ markers)
        let tokens: Vec<&str> = results[0]
            .tokens
            .iter()
            .filter_map(|&id| {
                let idx = id as usize;
                if idx < self.vocab.len() {
                    let token = self.vocab[idx].as_str();
                    match token {
                        "<s>" | "</s>" | "<OOV>" | "<blank>" => None,
                        _ => Some(token),
                    }
                } else {
                    None
                }
            })
            .collect();

        let text = bpe_decode(&tokens);

        Ok(TranscriptionResult {
            text,
            emotion: None,
            event: None,
            segments: None,
        })
    }
}

impl SpeechModel for ParaformerModel {
    fn capabilities(&self) -> ModelCapabilities {
        CAPABILITIES
    }

    fn transcribe_raw(
        &mut self,
        samples: &[f32],
        _options: &TranscribeOptions,
    ) -> Result<TranscriptionResult, TranscribeError> {
        self.infer(samples)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_bpe_decode() {
        assert_eq!(bpe_decode(&[]), "");
        assert_eq!(bpe_decode(&["hello"]), "hello");
        assert_eq!(bpe_decode(&["hello@@", "world"]), "helloworld");
        assert_eq!(bpe_decode(&["hello", "world"]), "hello world");
        assert_eq!(bpe_decode(&["cour@@", "se"]), "course");
        assert_eq!(bpe_decode(&["impos@@", "si@@", "ble"]), "impossible");
        assert_eq!(bpe_decode(&["<blank>"]), "<blank>");
        assert_eq!(bpe_decode(&["测", "试", "网", "址"]), "测试网址");
        assert_eq!(bpe_decode(&["测", "试", "中", "文"]), "测试中文");
        assert_eq!(bpe_decode(&["测", "试", "hello", "世", "界"]), "测试 hello 世界");
        assert_eq!(bpe_decode(&["hello", "world"]), "hello world");
    }

    #[test]
    fn test_load_model_not_found() {
        let dir = PathBuf::from("/nonexistent/paraformer/path");
        let result = ParaformerModel::load(&dir, &Quantization::FP32);
        match result {
            Err(TranscribeError::ModelNotFound(p)) => {
                assert!(p.to_string_lossy().contains("model.onnx"));
            }
            Err(other) => panic!("Expected ModelNotFound, got: {other:?}"),
            Ok(_) => panic!("Expected error but model loaded successfully"),
        }
    }

    #[test]
    fn test_capabilities() {
        assert_eq!(CAPABILITIES.name, "Paraformer");
        assert_eq!(CAPABILITIES.sample_rate, 16000);
        assert!(CAPABILITIES.languages.contains(&"zh"));
        assert!(!CAPABILITIES.supports_timestamps);
        assert!(!CAPABILITIES.supports_translation);
    }
}
