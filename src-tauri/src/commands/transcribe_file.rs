use crate::audio_toolkit::audio::{decode_mp3, read_wav_samples};
use crate::managers::transcription::TranscriptionManager;
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

#[tauri::command]
#[specta::specta]
pub fn transcribe_audio_file(
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
        "wav" => {
            let samples =
                read_wav_samples(path).map_err(|e| format!("Failed to read WAV: {}", e))?;
            let duration_ms = (samples.len() as f64 / 16000.0 * 1000.0) as u64;
            (samples, duration_ms)
        }
        "mp3" => decode_mp3(path).map_err(|e| format!("Failed to decode MP3: {}", e))?,
        _ => return Err(format!("Unsupported file format: {}", ext)),
    };

    if samples.is_empty() {
        return Err("No audio samples found".into());
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
