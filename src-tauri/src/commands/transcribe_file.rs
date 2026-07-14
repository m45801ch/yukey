use crate::audio_toolkit::audio::decode_mp3;
use crate::managers::transcription::TranscriptionManager;
use crate::settings::get_settings;
use log::info;
use rubato::{FftFixedIn, Resampler};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
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

        let model_load_start = std::time::Instant::now();
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
        let model_load_ms = model_load_start.elapsed().as_millis() as u64;

        let _ = app.emit(
            "file-transcription-start",
            FileProgressPayload {
                file_name: file_name.clone(),
                progress: 0.0,
                file_index: i,
                total_files: total,
            },
        );

        let progress_flag = Arc::new(AtomicBool::new(true));
        let flag_clone = progress_flag.clone();
        let app_clone = app.clone();
        let fname = file_name.clone();

        let audio_duration_ms = duration_ms;
        let base_overhead_ms = model_load_ms;
        let estimate_total_ms = (audio_duration_ms as f64 * 0.6) as u64 + base_overhead_ms;
        let start = std::time::Instant::now();

        let progress_handle = std::thread::spawn(move || {
            while flag_clone.load(Ordering::Relaxed) {
                let elapsed = start.elapsed().as_millis() as u64;
                let pct = if estimate_total_ms > 0 {
                    ((elapsed as f64 / estimate_total_ms as f64) * 100.0).min(95.0)
                } else {
                    0.0
                };
                let _ = app_clone.emit(
                    "file-transcription-progress",
                    FileProgressPayload {
                        file_name: fname.clone(),
                        progress: pct,
                        file_index: i,
                        total_files: total,
                    },
                );
                std::thread::sleep(std::time::Duration::from_millis(150));
            }
        });

        let result = transcription_manager
            .transcribe(samples, "file")
            .map(|text| FileTranscriptionResult {
                file_name: file_name.clone(),
                text,
                duration_sec: duration_ms / 1000,
                engine: "local".to_string(),
            })
            .map_err(|e| format!("Transcription failed: {}", e));

        progress_flag.store(false, Ordering::Relaxed);
        let _ = progress_handle.join();

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
                file_name,
                file_index: i,
                total_files: total,
                success: result.is_ok(),
                error: result.as_ref().err().cloned(),
            },
        );

        results.push(result);
    }

    results
}

#[tauri::command]
#[specta::specta]
pub fn transcribe_audio_file(
    app: tauri::AppHandle,
    file_path: String,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
) -> Result<FileTranscriptionResult, String> {
    let results = transcribe_queue(app, vec![file_path], transcription_manager.inner().clone());
    results.into_iter().next().unwrap_or(Err("No files".into()))
}

#[tauri::command]
#[specta::specta]
pub fn transcribe_audio_files(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
    transcription_manager: State<'_, Arc<TranscriptionManager>>,
) -> Result<Vec<FileTranscriptionResult>, String> {
    let results = transcribe_queue(app, file_paths, transcription_manager.inner().clone());
    let mut ok_results = Vec::with_capacity(results.len());
    for r in results {
        ok_results.push(r?);
    }
    Ok(ok_results)
}
