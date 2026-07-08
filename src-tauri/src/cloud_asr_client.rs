use crate::settings::CloudAsrSettings;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION};
use reqwest::multipart::{Form, Part};
use serde::Deserialize;
use std::path::Path;
use std::fs::File;
use std::io::Read;
use tauri::AppHandle;
use log::{info, error};

#[derive(Debug, Deserialize)]
struct OpenAIModelsResponse {
    data: Vec<OpenAIModel>,
}

#[derive(Debug, Deserialize)]
struct OpenAIModel {
    id: String,
}

#[derive(Debug, Deserialize)]
struct OpenAITranscriptionResponse {
    text: String,
}

#[derive(Debug, Deserialize, Clone)]
struct GeminiGenerateContentResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Deserialize, Clone)]
struct GeminiCandidate {
    content: Option<GeminiContent>,
}

#[derive(Debug, Deserialize, Clone)]
struct GeminiContent {
    parts: Option<Vec<GeminiPart>>,
}

#[derive(Debug, Deserialize, Clone)]
struct GeminiPart {
    text: Option<String>,
}

/// Generates a 0.5s silent 16kHz 16-bit Mono WAV file in memory
fn generate_silent_wav() -> Vec<u8> {
    let sample_rate: u32 = 16000;
    let num_channels: u16 = 1;
    let bits_per_sample: u16 = 16;
    let num_samples = sample_rate / 2; // 0.5 seconds
    let data_size = num_samples * (bits_per_sample as u32 / 8) * num_channels as u32;
    let file_size = 36 + data_size;

    let mut wav = Vec::with_capacity(44 + data_size as usize);

    // RIFF header
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&file_size.to_le_bytes());
    wav.extend_from_slice(b"WAVE");

    // fmt subchunk
    wav.extend_from_slice(b"fmt ");
    wav.extend_from_slice(&16u32.to_le_bytes()); // subchunk size
    wav.extend_from_slice(&1u16.to_le_bytes());  // AudioFormat (PCM = 1)
    wav.extend_from_slice(&num_channels.to_le_bytes());
    wav.extend_from_slice(&sample_rate.to_le_bytes());
    let byte_rate = sample_rate * num_channels as u32 * (bits_per_sample as u32 / 8);
    wav.extend_from_slice(&byte_rate.to_le_bytes());
    let block_align = num_channels * (bits_per_sample / 8);
    wav.extend_from_slice(&block_align.to_le_bytes());
    wav.extend_from_slice(&bits_per_sample.to_le_bytes());

    // data subchunk
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&data_size.to_le_bytes());

    // 0.5 seconds of silence (all zeros)
    wav.resize(wav.len() + data_size as usize, 0);

    wav
}

/// Helper to build headers for compatible OpenAI-style requests
fn build_openai_headers(api_key: &str) -> HeaderMap {
    let mut headers = HeaderMap::new();
    if !api_key.is_empty() {
        if let Ok(val) = HeaderValue::from_str(&format!("Bearer {}", api_key)) {
            headers.insert(AUTHORIZATION, val);
        }
    }
    headers
}

/// Transcribes audio bytes using the configured cloud ASR provider
pub async fn transcribe_audio_bytes(
    cloud_asr: &CloudAsrSettings,
    audio_bytes: Vec<u8>,
    filename: &str,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let provider = cloud_asr.provider.to_lowercase();

    match provider.as_str() {
        "groq" | "openai" | "openrouter" | "deepgram" => {
            let url = if provider == "groq" {
                "https://api.groq.com/openai/v1/audio/transcriptions"
            } else if provider == "openai" {
                "https://api.openai.com/v1/audio/transcriptions"
            } else if provider == "openrouter" {
                "https://openrouter.ai/api/v1/audio/transcriptions"
            } else if provider == "deepgram" && cloud_asr.base_url.is_empty() {
                "https://api.deepgram.com/v1/listen"
            } else {
                // custom or endpoint override
                &format!("{}/audio/transcriptions", cloud_asr.base_url.trim_end_matches('/'))
            };

            let mut headers = build_openai_headers(&cloud_asr.api_key);
            
            // Deepgram custom endpoint check
            if provider == "deepgram" {
                headers.insert(
                    AUTHORIZATION,
                    HeaderValue::from_str(&format!("Token {}", cloud_asr.api_key))
                        .map_err(|e| e.to_string())?,
                );
            }

            let file_part = Part::bytes(audio_bytes)
                .file_name(filename.to_string())
                .mime_str("audio/wav")
                .map_err(|e| e.to_string())?;

            let form = Form::new()
                .part("file", file_part)
                .text("model", cloud_asr.model.clone());

            // Deepgram query parameters for ASR options
            let target_url = if provider == "deepgram" && url.contains("listen") {
                format!("{}?model={}&smart_format=true", url, cloud_asr.model)
            } else {
                url.to_string()
            };

            let res = client
                .post(&target_url)
                .headers(headers)
                .multipart(form)
                .send()
                .await
                .map_err(|e| format!("HTTP request failed: {}", e))?;

            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("ASR Server returned error: {}", err_text));
            }

            // Deepgram has a different response shape if /v1/listen was hit directly
            if provider == "deepgram" && target_url.contains("listen") {
                #[derive(Debug, Deserialize)]
                struct DeepgramResponse {
                    results: Option<DeepgramResults>,
                }
                #[derive(Debug, Deserialize)]
                struct DeepgramResults {
                    channels: Option<Vec<DeepgramChannel>>,
                }
                #[derive(Debug, Deserialize, Clone)]
                struct DeepgramChannel {
                    alternatives: Option<Vec<DeepgramAlternative>>,
                }
                #[derive(Debug, Deserialize, Clone)]
                struct DeepgramAlternative {
                    transcript: Option<String>,
                }

                let dg_res: DeepgramResponse = res
                    .json()
                    .await
                    .map_err(|e| format!("Failed to parse Deepgram response: {}", e))?;

                let transcript = dg_res
                    .results
                    .and_then(|r| r.channels)
                    .and_then(|c| c.first().cloned())
                    .and_then(|ch| ch.alternatives)
                    .and_then(|a| a.first().cloned())
                    .and_then(|alt| alt.transcript)
                    .unwrap_or_default();

                Ok(transcript)
            } else {
                let parsed: OpenAITranscriptionResponse = res
                    .json()
                    .await
                    .map_err(|e| format!("Failed to parse JSON response: {}", e))?;
                Ok(parsed.text)
            }
        }
        "gemini" => {
            // Google AI Studio Gemini API
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
                cloud_asr.model, cloud_asr.api_key
            );

            // Audio Base64 encoding
            let base64_audio = base64::Engine::encode(
                &base64::prelude::BASE64_STANDARD,
                &audio_bytes,
            );

            let body = serde_json::json!({
                "contents": [{
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": "audio/wav",
                                "data": base64_audio
                            }
                        },
                        {
                            "text": "Transcribe this audio precisely. Do not translate. Output ONLY the transcription text."
                        }
                    ]
                }]
            });

            let res = client
                .post(&url)
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Gemini API request failed: {}", e))?;

            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Gemini API returned error: {}", err_text));
            }

            let parsed: GeminiGenerateContentResponse = res
                .json()
                .await
                .map_err(|e| format!("Failed to parse Gemini response: {}", e))?;

            let text = parsed
                .candidates
                .and_then(|c| c.first().cloned())
                .and_then(|cand| cand.content)
                .and_then(|cnt| cnt.parts)
                .and_then(|parts| {
                    parts
                        .iter()
                        .map(|p| p.text.clone().unwrap_or_default())
                        .collect::<Vec<String>>()
                        .first()
                        .cloned()
                })
                .unwrap_or_default();

            Ok(text.trim().to_string())
        }
        "huggingface" => {
            let url = if cloud_asr.base_url.is_empty() {
                format!("https://api-inference.huggingface.co/models/{}", cloud_asr.model)
            } else {
                cloud_asr.base_url.clone()
            };

            let mut headers = HeaderMap::new();
            if !cloud_asr.api_key.is_empty() {
                headers.insert(
                    AUTHORIZATION,
                    HeaderValue::from_str(&format!("Bearer {}", cloud_asr.api_key))
                        .map_err(|e| e.to_string())?,
                );
            }

            let res = client
                .post(&url)
                .headers(headers)
                .body(audio_bytes)
                .send()
                .await
                .map_err(|e| format!("Hugging Face request failed: {}", e))?;

            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Hugging Face returned error: {}", err_text));
            }

            #[derive(Debug, Deserialize)]
            struct HFResponse {
                text: String,
            }

            let parsed: HFResponse = res
                .json()
                .await
                .map_err(|e| format!("Failed to parse Hugging Face response: {}", e))?;
            Ok(parsed.text)
        }
        "cloudflare" => {
            // Cloudflare Workers AI ASR
            let url = cloud_asr.base_url.replace("{model}", &cloud_asr.model);

            let mut headers = HeaderMap::new();
            if !cloud_asr.api_key.is_empty() {
                headers.insert(
                    AUTHORIZATION,
                    HeaderValue::from_str(&format!("Bearer {}", cloud_asr.api_key))
                        .map_err(|e| e.to_string())?,
                );
            }

            let res = client
                .post(&url)
                .headers(headers)
                .body(audio_bytes)
                .send()
                .await
                .map_err(|e| format!("Cloudflare request failed: {}", e))?;

            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Cloudflare Workers AI returned error: {}", err_text));
            }

            #[derive(Debug, Deserialize)]
            struct CFResponse {
                result: Option<CFResult>,
            }
            #[derive(Debug, Deserialize)]
            struct CFResult {
                text: Option<String>,
            }

            let parsed: CFResponse = res
                .json()
                .await
                .map_err(|e| format!("Failed to parse Cloudflare response: {}", e))?;

            let text = parsed
                .result
                .and_then(|r| r.text)
                .unwrap_or_default();

            Ok(text)
        }
        _ => Err("Unsupported Cloud ASR provider".to_string()),
    }
}

/// Transcribes an audio file on disk
pub async fn transcribe_audio_file(
    cloud_asr: &CloudAsrSettings,
    file_path: &Path,
) -> Result<String, String> {
    let mut file = File::open(file_path).map_err(|e| format!("Failed to open audio file: {}", e))?;
    let mut audio_bytes = Vec::new();
    file.read_to_end(&mut audio_bytes)
        .map_err(|e| format!("Failed to read audio file: {}", e))?;

    let filename = file_path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("audio.wav");

    transcribe_audio_bytes(cloud_asr, audio_bytes, filename).await
}

#[tauri::command]
#[specta::specta]
pub async fn verify_cloud_asr_connection(
    _app: AppHandle,
    cloud_asr: CloudAsrSettings,
) -> Result<(), String> {
    info!("Verifying Cloud ASR connection for provider: {}", cloud_asr.provider);
    let silent_audio = generate_silent_wav();
    match transcribe_audio_bytes(&cloud_asr, silent_audio, "silent.wav").await {
        Ok(_) => {
            info!("Cloud ASR connection verification succeeded.");
            Ok(())
        }
        Err(e) => {
            error!("Cloud ASR verification failed: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_cloud_asr_models(
    _app: AppHandle,
    cloud_asr: CloudAsrSettings,
) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let provider = cloud_asr.provider.to_lowercase();

    match provider.as_str() {
        "groq" | "openai" | "openrouter" => {
            let url = if provider == "groq" {
                "https://api.groq.com/openai/v1/models"
            } else if provider == "openai" {
                "https://api.openai.com/v1/models"
            } else {
                "https://openrouter.ai/api/v1/models"
            };

            let headers = build_openai_headers(&cloud_asr.api_key);
            let res = client
                .get(url)
                .headers(headers)
                .send()
                .await
                .map_err(|e| format!("Failed to fetch models: {}", e))?;

            if !res.status().is_success() {
                let err_text = res.text().await.unwrap_or_default();
                return Err(format!("Model API returned error: {}", err_text));
            }

            let parsed: OpenAIModelsResponse = res
                .json()
                .await
                .map_err(|e| format!("Failed to parse models JSON: {}", e))?;

            // Filter models: ASR relevant names
            let filtered: Vec<String> = parsed
                .data
                .into_iter()
                .map(|m| m.id)
                .filter(|id| {
                    let id_lower = id.to_lowercase();
                    id_lower.contains("whisper")
                        || id_lower.contains("asr")
                        || id_lower.contains("speech")
                        || id_lower.contains("transcribe")
                })
                .collect();

            Ok(filtered)
        }
        "gemini" => {
            // Google AI Studio models list
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models?key={}",
                cloud_asr.api_key
            );

            #[derive(Debug, Deserialize)]
            struct GeminiModelsResponse {
                models: Vec<GeminiModel>,
            }
            #[derive(Debug, Deserialize)]
            struct GeminiModel {
                name: String,
            }

            let res = client
                .get(&url)
                .send()
                .await
                .map_err(|e| format!("Failed to fetch Gemini models: {}", e))?;

            if !res.status().is_success() {
                return Err("Failed to fetch models from Gemini".to_string());
            }

            let parsed: GeminiModelsResponse = res
                .json()
                .await
                .map_err(|e| format!("Failed to parse Gemini models JSON: {}", e))?;

            let filtered: Vec<String> = parsed
                .models
                .into_iter()
                .map(|m| m.name.replace("models/", ""))
                // Gemini models support Audio input natively
                .filter(|name| name.contains("gemini-") || name.contains("flash"))
                .collect();

            Ok(filtered)
        }
        "huggingface" => {
            // HF has millions of models; return standard Whisper configurations
            Ok(vec![
                "openai/whisper-large-v3".to_string(),
                "openai/whisper-large-v3-turbo".to_string(),
                "openai/whisper-medium".to_string(),
                "openai/whisper-small".to_string(),
                "openai/whisper-tiny".to_string(),
            ])
        }
        "cloudflare" => {
            // Cloudflare standard Workers AI ASR model ID
            Ok(vec!["@cf/openai/whisper".to_string()])
        }
        "deepgram" => {
            // Deepgram common ASR models
            Ok(vec![
                "nova-2".to_string(),
                "nova-2-general".to_string(),
                "nova-2-meeting".to_string(),
                "nova-2-phone".to_string(),
                "whisper-large".to_string(),
            ])
        }
        _ => Err("Unsupported model list provider".to_string()),
    }
}
