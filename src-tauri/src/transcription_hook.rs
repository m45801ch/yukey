//! Optional user hook: `<app data dir>/hooks/transcription` receives the text
//! about to be pasted on stdin, and its stdout is pasted instead.
//!
//! Windows: extensionless scripts are not executable, so we also look for
//! .exe/.cmd/.bat/.ps1 and hide the console window with CREATE_NO_WINDOW.

use anyhow::Context;
use log::error;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::Duration;
use tauri::AppHandle;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

/// Hung hooks are killed so they can't leave the pipeline stuck in "transcribing".
const HOOK_TIMEOUT: Duration = Duration::from_secs(30);

/// Returns the hook's output, or `text` unchanged if there's no hook or it
/// fails. Dropping the future kills the hook, so callers can cancel it.
pub async fn apply(app: &AppHandle, text: String) -> String {
    let Ok(dir) = crate::portable::app_data_dir(app) else {
        return text;
    };
    let Some(hook) = find_hook(&dir.join("hooks")) else {
        return text;
    };
    if text.is_empty() {
        return text;
    }

    run(&hook, &text).await.unwrap_or_else(|e| {
        error!("Transcription hook failed, using original text: {:#}", e);
        text
    })
}

#[cfg(not(target_os = "windows"))]
fn find_hook(dir: &Path) -> Option<PathBuf> {
    let hook = dir.join("transcription");
    hook.is_file().then_some(hook)
}

#[cfg(target_os = "windows")]
fn find_hook(dir: &Path) -> Option<PathBuf> {
    // CreateProcessW cannot run an extensionless script (no PE header, no
    // shebang). Prefer real executables, then scripts we can wrap for the user.
    for name in [
        "transcription.exe",
        "transcription.cmd",
        "transcription.bat",
        "transcription.ps1",
        "transcription", // native PE binary with no extension
    ] {
        let hook = dir.join(name);
        if hook.is_file() {
            return Some(hook);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn build_command(hook: &Path) -> std::process::Command {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let is_ps1 = hook
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.eq_ignore_ascii_case("ps1"))
        .unwrap_or(false);

    let mut cmd = if is_ps1 {
        // .ps1 is not directly executable; go through PowerShell.
        let mut c = std::process::Command::new("powershell.exe");
        c.args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
        ])
        .arg(hook);
        c
    } else {
        // .cmd/.bat are wrapped with cmd.exe /C by Rust std; .exe runs directly.
        std::process::Command::new(hook)
    };

    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[cfg(not(target_os = "windows"))]
fn build_command(hook: &Path) -> std::process::Command {
    let mut cmd = std::process::Command::new(hook);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    cmd
}

async fn run(hook: &Path, text: &str) -> anyhow::Result<String> {
    // Setting creation_flags on the std command first is what keeps the
    // console window hidden; kill_on_drop must be set on the tokio command.
    let mut cmd = Command::from(build_command(hook));
    cmd.kill_on_drop(true);
    let mut child = cmd.spawn()?;

    // Write input while reading output so neither side blocks on a full pipe.
    // Write errors are ignored: a hook may exit without reading its input.
    let mut stdin = child.stdin.take().context("stdin not piped")?;
    let write = async move {
        let _ = stdin.write_all(text.as_bytes()).await;
    };
    let (_, output) = tokio::time::timeout(HOOK_TIMEOUT, async {
        tokio::join!(write, child.wait_with_output())
    })
    .await
    .context("timed out")?;
    let output = output?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    anyhow::ensure!(
        output.status.success(),
        "exited with {}: {}",
        output.status,
        stderr.trim()
    );

    // Drop one trailing newline (CRLF on Windows too) so `echo` output
    // doesn't submit a terminal line.
    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout
        .strip_suffix("\r\n")
        .or_else(|| stdout.strip_suffix('\n'))
        .unwrap_or(&stdout);
    Ok(trimmed.to_string())
}
