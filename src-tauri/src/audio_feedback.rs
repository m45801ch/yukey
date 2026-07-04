use crate::settings::SoundTheme;
use crate::settings::{self, AppSettings};
use cpal::traits::{DeviceTrait, HostTrait};
use log::{debug, error, warn};
use rodio::OutputStreamBuilder;
use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};
use std::thread;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SoundType {
    Start,
    Stop,
    AiStart,
    AiStop,
    TranslateStart,
    TranslateStop,
    PostProcessStart,
    PostProcessStop,
}

fn resolve_sound_path(
    app: &AppHandle,
    settings: &AppSettings,
    sound_type: SoundType,
) -> Option<PathBuf> {
    let sound_file = get_sound_path(settings, sound_type);
    let base_dir = get_sound_base_dir(settings);
    let resolved = match base_dir {
        tauri::path::BaseDirectory::AppData => {
            crate::portable::resolve_app_data(app, &sound_file).ok()
        }
        _ => app.path().resolve(&sound_file, base_dir).ok(),
    };

    // Fallback for custom sound files that might not exist yet
    if resolved.as_ref().map_or(true, |p| !p.exists()) {
        match sound_type {
            SoundType::AiStart | SoundType::TranslateStart | SoundType::PostProcessStart => {
                resolve_sound_path(app, settings, SoundType::Start)
            }
            SoundType::AiStop | SoundType::TranslateStop | SoundType::PostProcessStop => {
                resolve_sound_path(app, settings, SoundType::Stop)
            }
            _ => resolved,
        }
    } else {
        resolved
    }
}

fn get_sound_path(settings: &AppSettings, sound_type: SoundType) -> String {
    match (settings.sound_theme, sound_type) {
        (SoundTheme::Custom, SoundType::Start) => "custom_start.wav".to_string(),
        (SoundTheme::Custom, SoundType::Stop) => "custom_stop.wav".to_string(),
        (SoundTheme::Custom, SoundType::AiStart) => "custom_ai_start.wav".to_string(),
        (SoundTheme::Custom, SoundType::AiStop) => "custom_ai_stop.wav".to_string(),
        (SoundTheme::Custom, SoundType::TranslateStart) => "custom_translate_start.wav".to_string(),
        (SoundTheme::Custom, SoundType::TranslateStop) => "custom_translate_stop.wav".to_string(),
        (SoundTheme::Custom, SoundType::PostProcessStart) => "custom_post_process_start.wav".to_string(),
        (SoundTheme::Custom, SoundType::PostProcessStop) => "custom_post_process_stop.wav".to_string(),
        (_, SoundType::Start) | (_, SoundType::AiStart) | (_, SoundType::TranslateStart) | (_, SoundType::PostProcessStart) => {
            settings.sound_theme.to_start_path()
        }
        (_, SoundType::Stop) | (_, SoundType::AiStop) | (_, SoundType::TranslateStop) | (_, SoundType::PostProcessStop) => {
            settings.sound_theme.to_stop_path()
        }
    }
}

fn get_sound_base_dir(settings: &AppSettings) -> tauri::path::BaseDirectory {
    match settings.sound_theme {
        SoundTheme::Custom => tauri::path::BaseDirectory::AppData,
        _ => tauri::path::BaseDirectory::Resource,
    }
}

pub fn play_feedback_sound(app: &AppHandle, sound_type: SoundType) {
    let settings = settings::get_settings(app);
    if !settings.audio_feedback {
        return;
    }
    if let Some(path) = resolve_sound_path(app, &settings, sound_type) {
        let speed = match sound_type {
            SoundType::AiStart | SoundType::AiStop => 1.25,
            SoundType::TranslateStart | SoundType::TranslateStop => 0.85,
            SoundType::PostProcessStart | SoundType::PostProcessStop => 0.65,
            _ => 1.0,
        };
        play_sound_async(app, path, speed);
    }
}

pub fn play_feedback_sound_at_speed(app: &AppHandle, sound_type: SoundType, speed: f32) {
    let settings = settings::get_settings(app);
    if !settings.audio_feedback {
        return;
    }
    if let Some(path) = resolve_sound_path(app, &settings, sound_type) {
        play_sound_async(app, path, speed);
    }
}

pub fn play_feedback_sound_blocking(app: &AppHandle, sound_type: SoundType) {
    let settings = settings::get_settings(app);
    if !settings.audio_feedback {
        return;
    }
    if let Some(path) = resolve_sound_path(app, &settings, sound_type) {
        let speed = match sound_type {
            SoundType::AiStart | SoundType::AiStop => 1.25,
            SoundType::TranslateStart | SoundType::TranslateStop => 0.85,
            _ => 1.0,
        };
        play_sound_blocking(app, &path, speed);
    }
}

pub fn play_test_sound(app: &AppHandle, sound_type: SoundType) {
    let settings = settings::get_settings(app);
    if let Some(path) = resolve_sound_path(app, &settings, sound_type) {
        let speed = match sound_type {
            SoundType::AiStart | SoundType::AiStop => 1.25,
            SoundType::TranslateStart | SoundType::TranslateStop => 0.85,
            _ => 1.0,
        };
        play_sound_blocking(app, &path, speed);
    }
}

fn play_sound_async(app: &AppHandle, path: PathBuf, speed: f32) {
    let app_handle = app.clone();
    thread::spawn(move || {
        if let Err(e) = play_sound_at_path(&app_handle, path.as_path(), speed) {
            error!("Failed to play sound '{}': {}", path.display(), e);
        }
    });
}

fn play_sound_blocking(app: &AppHandle, path: &Path, speed: f32) {
    if let Err(e) = play_sound_at_path(app, path, speed) {
        error!("Failed to play sound '{}': {}", path.display(), e);
    }
}

fn play_sound_at_path(
    app: &AppHandle,
    path: &Path,
    speed: f32,
) -> Result<(), Box<dyn std::error::Error>> {
    let settings = settings::get_settings(app);
    let volume = settings.audio_feedback_volume;
    let selected_device = settings.selected_output_device.clone();
    play_audio_file(path, selected_device, volume, speed)
}

fn play_audio_file(
    path: &std::path::Path,
    selected_device: Option<String>,
    volume: f32,
    speed: f32,
) -> Result<(), Box<dyn std::error::Error>> {
    let stream_builder = if let Some(device_name) = selected_device {
        if device_name == "Default" {
            debug!("Using default device");
            OutputStreamBuilder::from_default_device()?
        } else {
            let host = crate::audio_toolkit::get_cpal_host();
            let devices = host.output_devices()?;

            let mut found_device = None;
            for device in devices {
                if device.name()? == device_name {
                    found_device = Some(device);
                    break;
                }
            }

            match found_device {
                Some(device) => OutputStreamBuilder::from_device(device)?,
                None => {
                    warn!("Device '{}' not found, using default device", device_name);
                    OutputStreamBuilder::from_default_device()?
                }
            }
        }
    } else {
        debug!("Using default device");
        OutputStreamBuilder::from_default_device()?
    };

    let stream_handle = stream_builder.open_stream()?;
    let mixer = stream_handle.mixer();

    let file = File::open(path)?;
    let buf_reader = BufReader::new(file);

    let sink = rodio::play(mixer, buf_reader)?;
    sink.set_volume(volume);
    if speed != 1.0 {
        sink.set_speed(speed);
    }
    sink.sleep_until_end();

    Ok(())
}
