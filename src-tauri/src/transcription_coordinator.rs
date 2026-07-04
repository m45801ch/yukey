use crate::actions::ACTION_MAP;
use crate::managers::audio::AudioRecordingManager;
use log::{debug, error, warn};
use std::sync::mpsc::{self, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

const DEBOUNCE: Duration = Duration::from_millis(30);

/// Commands processed sequentially by the coordinator thread.
enum Command {
    Input {
        binding_id: String,
        hotkey_string: String,
        is_pressed: bool,
        push_to_talk: bool,
    },
    Cancel {
        recording_was_active: bool,
    },
    ProcessingFinished,
}

/// Pipeline lifecycle, owned exclusively by the coordinator thread.
#[derive(Debug)]
enum Stage {
    Idle,
    Recording(String), // binding_id
    Processing,
}

/// Serialises all transcription lifecycle events through a single thread
/// to eliminate race conditions between keyboard shortcuts, signals, and
/// the async transcribe-paste pipeline.
pub struct TranscriptionCoordinator {
    tx: Sender<Command>,
}

pub fn is_transcribe_binding(id: &str) -> bool {
    id == "transcribe"
        || id == "transcribe_with_post_process"
        || id == "translate"
        || id == "ask_ai"
}

impl TranscriptionCoordinator {
    pub fn new(app: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel();

        thread::spawn(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let mut stage = Stage::Idle;
                let mut last_press: Option<Instant> = None;

                while let Ok(cmd) = rx.recv() {
                    match cmd {
                        Command::Input {
                            binding_id,
                            hotkey_string,
                            is_pressed,
                            push_to_talk,
                        } => {
                            // Debounce rapid-fire press events (key repeat / double-tap).
                            // Releases always pass through for push-to-talk.
                            if is_pressed {
                                let now = Instant::now();
                                if last_press.is_some_and(|t| now.duration_since(t) < DEBOUNCE) {
                                    debug!("Debounced press for '{binding_id}'");
                                    continue;
                                }
                                last_press = Some(now);
                            }

                            if push_to_talk {
                                if is_pressed && matches!(stage, Stage::Idle) {
                                    start(&app, &mut stage, &binding_id, &hotkey_string);
                                } else if is_pressed
                                    && matches!(&stage, Stage::Recording(ref id) if id != &binding_id && (binding_id == "ask_ai" || binding_id == "translate" || binding_id == "transcribe_with_post_process"))
                                {
                                    debug!(
                                        "Switching active recording from '{:?}' to '{}'",
                                        stage, binding_id
                                    );
                                    let new_id = binding_id.clone();
                                    stage = Stage::Recording(new_id.clone());
                                    if let Some(audio_manager) =
                                        app.try_state::<Arc<AudioRecordingManager>>()
                                    {
                                        audio_manager.switch_binding_id(&new_id);
                                    }
                                    // Play sound feedback for the switch (1.5x speed for a short blip)
                                    let sound = match new_id.as_str() {
                                        "ask_ai" => crate::audio_feedback::SoundType::AiStart,
                                        "translate" => {
                                            crate::audio_feedback::SoundType::TranslateStart
                                        }
                                        "transcribe_with_post_process" => {
                                            crate::audio_feedback::SoundType::PostProcessStart
                                        }
                                        _ => crate::audio_feedback::SoundType::Start,
                                    };
                                    crate::audio_feedback::play_feedback_sound_at_speed(
                                        &app, sound, 1.5,
                                    );
                                    // Notify frontend
                                    let _ = app.emit("active-binding-changed", new_id);
                                } else if !is_pressed {
                                    let mut should_stop = None;
                                    if let Stage::Recording(ref active_id) = stage {
                                        if active_id == &binding_id
                                            || ((active_id == "ask_ai" || active_id == "translate")
                                                && binding_id != *active_id)
                                        {
                                            should_stop = Some(active_id.clone());
                                        }
                                    }
                                    if let Some(stop_id) = should_stop {
                                        stop(&app, &mut stage, &stop_id, &hotkey_string);
                                    }
                                }
                            } else if is_pressed {
                                match &stage {
                                    Stage::Idle => {
                                        start(&app, &mut stage, &binding_id, &hotkey_string);
                                    }
                                    Stage::Recording(id) if id == &binding_id => {
                                        stop(&app, &mut stage, &binding_id, &hotkey_string);
                                    }
                                    Stage::Recording(id)
                                        if id != &binding_id
                                            && (binding_id == "ask_ai"
                                                || binding_id == "translate"
                                                || binding_id == "transcribe_with_post_process") =>
                                    {
                                        debug!("Switching active recording from '{id}' to '{binding_id}'");
                                        let new_id = binding_id.clone();
                                        stage = Stage::Recording(new_id.clone());
                                        if let Some(audio_manager) =
                                            app.try_state::<Arc<AudioRecordingManager>>()
                                        {
                                            audio_manager.switch_binding_id(&new_id);
                                        }
                                        // Play sound feedback for the switch
                                        let sound = match new_id.as_str() {
                                            "ask_ai" => crate::audio_feedback::SoundType::AiStart,
                                            "translate" => {
                                                crate::audio_feedback::SoundType::TranslateStart
                                            }
                                            "transcribe_with_post_process" => {
                                                crate::audio_feedback::SoundType::PostProcessStart
                                            }
                                            _ => crate::audio_feedback::SoundType::Start,
                                        };
                                        crate::audio_feedback::play_feedback_sound_at_speed(
                                            &app, sound, 1.5,
                                        );
                                        // Notify frontend
                                        let _ = app.emit("active-binding-changed", new_id);
                                    }
                                    _ => {
                                        debug!("Ignoring press for '{binding_id}': pipeline busy")
                                    }
                                }
                            }
                        }
                        Command::Cancel {
                            recording_was_active,
                        } => {
                            // Don't reset during processing — wait for the pipeline to finish.
                            if !matches!(stage, Stage::Processing)
                                && (recording_was_active || matches!(stage, Stage::Recording(_)))
                            {
                                stage = Stage::Idle;
                            }
                        }
                        Command::ProcessingFinished => {
                            stage = Stage::Idle;
                        }
                    }
                }
                debug!("Transcription coordinator exited");
            }));
            if let Err(e) = result {
                error!("Transcription coordinator panicked: {e:?}");
            }
        });

        Self { tx }
    }

    /// Send a keyboard/signal input event for a transcribe binding.
    /// For signal-based toggles, use `is_pressed: true` and `push_to_talk: false`.
    pub fn send_input(
        &self,
        binding_id: &str,
        hotkey_string: &str,
        is_pressed: bool,
        push_to_talk: bool,
    ) {
        if self
            .tx
            .send(Command::Input {
                binding_id: binding_id.to_string(),
                hotkey_string: hotkey_string.to_string(),
                is_pressed,
                push_to_talk,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_cancel(&self, recording_was_active: bool) {
        if self
            .tx
            .send(Command::Cancel {
                recording_was_active,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_processing_finished(&self) {
        if self.tx.send(Command::ProcessingFinished).is_err() {
            warn!("Transcription coordinator channel closed");
        }
    }
}

fn start(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    let Some(action) = ACTION_MAP.get(binding_id) else {
        warn!("No action in ACTION_MAP for '{binding_id}'");
        return;
    };
    action.start(app, binding_id, hotkey_string);
    if app
        .try_state::<Arc<AudioRecordingManager>>()
        .is_some_and(|a| a.is_recording())
    {
        *stage = Stage::Recording(binding_id.to_string());
    } else {
        debug!("Start for '{binding_id}' did not begin recording; staying idle");
    }
}

fn stop(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey_string: &str) {
    let Some(action) = ACTION_MAP.get(binding_id) else {
        warn!("No action in ACTION_MAP for '{binding_id}'");
        return;
    };
    action.stop(app, binding_id, hotkey_string);
    *stage = Stage::Processing;
}
