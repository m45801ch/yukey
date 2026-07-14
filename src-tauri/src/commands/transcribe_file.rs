use crate::audio_toolkit::audio::decode_mp3;
use crate::managers::transcription::TranscriptionManager;
use crate::settings::get_settings;
use log::info;
use rubato::{FftFixedIn, Resampler};
use serde::Serialize;
use specta::Type;
use std::path::Path;
use std::sync::Arc;
use tauri::State;

#[derive(Debug, Clone, Serialize, Type)]
pub struct FileTranscriptionResult {
    pub file_name: String,
    pub text: String,
    pub duration_sec: u64,
    pub engine: String,
}

fn read_wav_mono_16k(path: &Path) -> Result<(Vec<f32>, u64), String> {
    let reader = hound::WavReader::open(path).map_err(|e| format!("Failed to open WAV: {}", e))?;
    let spec = reader.spec();
    let sample_rate = spec.sample_rate as usize;
    let channels = spec.channels as usize;

    let raw: Vec<f32> = reader
        .into_samples::<i16>()
        .map(|s| s.map(|v| v as f32 / i16::MAX as f32))
        .collect::<Result<Vec<f32>, _>>()
        .map_err(|e| format!("Failed to read WAV samples: {}", e))?;

    let mono = if channels > 1 {
        raw.chunks(channels)
            .map(|chunk| chunk.iter().sum::<f32>() / channels as f32)
            .collect()
    } else {
        raw
    };

    let duration_ms = (mono.len() as f64 / sample_rate as f64 * 1000.0) as u64;

    if mono.is_empty() {
        return Err("WAV file contains no samples".into());
    }

    if sample_rate == 16000 {
        return Ok((mono, duration_ms));
    }

    let mut resampler =
        FftFixedIn::<f32>::new(sample_rate, 16000, 1024, 1, 1).map_err(|e| format!("Resampler error: {}", e))?;
    let in_buf: Vec<&[f32]> = vec![&mono];
    let out = resampler
        .process(&in_buf, None)
        .map_err(|e| format!("Resample error: {}", e))?;
    let resampled: Vec<f32> = out.into_iter().flatten().collect();
    Ok((resampled, duration_ms))
}

#[tauri::command]
#[specta::specta]
pub fn transcribe_audio_file(
    app: tauri::AppHandle,
    file_path: String,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
) -> Result<FileTranscriptionResult, String> {
    let path = Path::new(&file_path);
    let file_name = path
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| file_path.clone());

    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_default();

    let (samples, duration_ms) = match ext.as_str() {
        "wav" => read_wav_mono_16k(path)?,
        "mp3" => decode_mp3(path).map_err(|e| format!("Failed to decode MP3: {}", e))?,
        _ => return Err(format!("Unsupported file format: {}", ext)),
    };

    if samples.is_empty() {
        return Err("No audio samples found".into());
    }

    if !transcription_manager.is_model_loaded() {
        let settings = get_settings(&app);
        let model_id = settings.selected_model.clone();
        info!("Auto-loading model '{}' for file transcription", model_id);
        transcription_manager
            .load_model(&model_id)
            .map_err(|e| format!("Failed to load model '{}': {}", model_id, e))?;
    }

    let text = transcription_manager
        .transcribe(samples, "file")
        .map_err(|e| format!("Transcription failed: {}", e))?;

    Ok(FileTranscriptionResult {
        file_name,
        text,
        duration_sec: duration_ms / 1000,
        engine: "local".to_string(),
    })
}
