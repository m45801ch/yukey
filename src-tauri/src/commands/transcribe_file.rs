use crate::audio_toolkit::audio::decode_mp3;
use crate::managers::transcription::TranscriptionManager;
use crate::settings::get_settings;
use log::{info, warn};
use rubato::{FftFixedIn, Resampler};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::Path;
use std::sync::Arc;
use tauri::{Emitter, State};

#[derive(Debug, Clone, Serialize, Type)]
pub struct FileTranscriptionResult {
    pub file_name: String,
    pub text: String,
    pub duration_sec: u64,
    pub engine: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, tauri_specta::Event)]
pub struct FileProgressPayload {
    pub file_name: String,
    pub progress: f64,
    pub file_index: usize,
    pub total_files: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, tauri_specta::Event)]
pub struct FileDonePayload {
    pub file_name: String,
    pub file_index: usize,
    pub total_files: usize,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type, tauri_specta::Event)]
pub struct QueueStartPayload {
    pub total_files: usize,
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

    let chunk = 1024;
    let mut resampler =
        FftFixedIn::<f32>::new(sample_rate, 16000, chunk, 1, 1).map_err(|e| format!("Resampler error: {}", e))?;
    let mut resampled = Vec::new();
    for c in mono.chunks(chunk) {
        let in_buf: Vec<&[f32]> = vec![c];
        let out = resampler
            .process(&in_buf, None)
            .map_err(|e| format!("Resample error: {}", e))?;
        for buf in out {
            resampled.extend_from_slice(&buf);
        }
    }
    Ok((resampled, duration_ms))
}

pub fn transcribe_queue(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
    transcription_manager: Arc<TranscriptionManager>,
) -> Vec<Result<FileTranscriptionResult, String>> {
    let total = file_paths.len();
    if total == 0 {
        return Vec::new();
    }

    let _ = app.emit(
        "file-transcription-queue-start",
        QueueStartPayload { total_files: total },
    );

    let mut results = Vec::with_capacity(total);

    for (i, file_path) in file_paths.iter().enumerate() {
        let path = Path::new(file_path);
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
            "wav" => match read_wav_mono_16k(path) {
                Ok(v) => v,
                Err(e) => {
                    let _ = app.emit(
                        "file-transcription-done",
                        FileDonePayload {
                            file_name,
                            file_index: i,
                            total_files: total,
                            success: false,
                            error: Some(e.clone()),
                        },
                    );
                    results.push(Err(e));
                    continue;
                }
            },
            "mp3" => match decode_mp3(path) {
                Ok(v) => v,
                Err(e) => {
                    let msg = format!("Failed to decode MP3: {}", e);
                    let _ = app.emit(
                        "file-transcription-done",
                        FileDonePayload {
                            file_name,
                            file_index: i,
                            total_files: total,
                            success: false,
                            error: Some(msg.clone()),
                        },
                    );
                    results.push(Err(msg));
                    continue;
                }
            },
            _ => {
                let msg = format!("Unsupported file format: {}", ext);
                let _ = app.emit(
                    "file-transcription-done",
                    FileDonePayload {
                        file_name,
                        file_index: i,
                        total_files: total,
                        success: false,
                        error: Some(msg.clone()),
                    },
                );
                results.push(Err(msg));
                continue;
            }
        };

        if samples.is_empty() {
            let msg = "No audio samples found".to_string();
            let _ = app.emit(
                "file-transcription-done",
                FileDonePayload {
                    file_name,
                    file_index: i,
                    total_files: total,
                    success: false,
                    error: Some(msg.clone()),
                },
            );
            results.push(Err(msg));
            continue;
        }

        if !transcription_manager.is_model_loaded() {
            let settings = get_settings(&app);
            let model_id = settings.selected_model.clone();
            info!("Auto-loading model '{}' for file transcription", model_id);
            if let Err(e) = transcription_manager.load_model(&model_id) {
                let msg = format!("Failed to load model '{}': {}", model_id, e);
                let _ = app.emit(
                    "file-transcription-done",
                    FileDonePayload {
                        file_name,
                        file_index: i,
                        total_files: total,
                        success: false,
                        error: Some(msg.clone()),
                    },
                );
                results.push(Err(msg));
                continue;
            }
        }

        let _ = app.emit(
            "file-transcription-start",
            FileProgressPayload {
                file_name: file_name.clone(),
                progress: 0.0,
                file_index: i,
                total_files: total,
            },
        );

        // Chunk audio into 60-second segments for real progress reporting
        const CHUNK_SEC: usize = 60;
        let sample_rate = 16000usize;
        let chunk_samples = CHUNK_SEC * sample_rate;
        let total_chunks = (samples.len() + chunk_samples - 1) / chunk_samples;

        info!(
            "Transcribing '{}': {} samples, {} seconds, {} chunks",
            file_name,
            samples.len(),
            duration_ms / 1000,
            total_chunks
        );

        let mut all_text = Vec::new();
        let mut transcribe_error: Option<String> = None;

        for chunk_idx in 0..total_chunks {
            let start = chunk_idx * chunk_samples;
            let end = std::cmp::min(start + chunk_samples, samples.len());
            let chunk = &samples[start..end];

            let pct = (chunk_idx as f64 / total_chunks as f64) * 100.0;
            let _ = app.emit(
                "file-transcription-progress",
                FileProgressPayload {
                    file_name: file_name.clone(),
                    progress: pct,
                    file_index: i,
                    total_files: total,
                },
            );

            match transcription_manager.transcribe(chunk.to_vec(), "file") {
                Ok(text) => {
                    if !text.trim().is_empty() {
                        all_text.push(text);
                    }
                }
                Err(e) => {
                    let msg = format!("Chunk {} failed: {}", chunk_idx + 1, e);
                    warn!("{}", msg);
                    transcribe_error = Some(msg);
                    break;
                }
            }
        }

        if let Some(err) = transcribe_error {
            let _ = app.emit(
                "file-transcription-done",
                FileDonePayload {
                    file_name,
                    file_index: i,
                    total_files: total,
                    success: false,
                    error: Some(err.clone()),
                },
            );
            results.push(Err(err));
        } else {
            let text = all_text.join("\n");
            let _ = app.emit(
                "file-transcription-progress",
                FileProgressPayload {
                    file_name: file_name.clone(),
                    progress: 100.0,
                    file_index: i,
                    total_files: total,
                },
            );
            let _ = app.emit(
                "file-transcription-done",
                FileDonePayload {
                    file_name: file_name.clone(),
                    file_index: i,
                    total_files: total,
                    success: true,
                    error: None,
                },
            );
            results.push(Ok(FileTranscriptionResult {
                file_name,
                text,
                duration_sec: duration_ms / 1000,
                engine: "local".to_string(),
            }));
        }
    }

    results
}

#[tauri::command]
#[specta::specta]
pub async fn transcribe_audio_file(
    app: tauri::AppHandle,
    file_path: String,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
) -> Result<FileTranscriptionResult, String> {
    let tm = transcription_manager.inner().clone();
    let results =
        tokio::task::spawn_blocking(move || transcribe_queue(app, vec![file_path], tm))
            .await
            .map_err(|e| format!("Task failed: {}", e))?;
    results.into_iter().next().unwrap_or(Err("No files".into()))
}

#[tauri::command]
#[specta::specta]
pub async fn transcribe_audio_files(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
) -> Result<Vec<FileTranscriptionResult>, String> {
    let tm = transcription_manager.inner().clone();
    let results =
        tokio::task::spawn_blocking(move || transcribe_queue(app, file_paths, tm))
            .await
            .map_err(|e| format!("Task failed: {}", e))?;
    let mut ok_results = Vec::with_capacity(results.len());
    for r in results {
        ok_results.push(r?);
    }
    Ok(ok_results)
}
