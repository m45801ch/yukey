import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Upload, FileAudio, Trash2, Copy, Loader2 } from "lucide-react";
import { commands } from "@/bindings";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";

const formatCopyText = (text: string, format: "plain" | "markdown"): string => {
  if (format === "markdown") {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    return `**${dateStr} ${timeStr}**\n\n${text}`;
  }
  return text;
};

type FileStatus = "queued" | "transcribing" | "done" | "error";

interface QueuedFile {
  id: string;
  path: string;
  name: string;
  duration: number;
  status: FileStatus;
  text?: string;
  error?: string;
}

const ALLOWED_EXTENSIONS = [".wav", ".mp3"];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function isAllowedFile(name: string): boolean {
  const lower = name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export const TranscribeFilePage: React.FC = () => {
  const { t } = useTranslation();
  const { copyFormat } = useSettings();
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const addEntries = useCallback((entries: { path: string; name: string }[]) => {
    const allowed = entries.filter((e) => isAllowedFile(e.name));
    if (allowed.length === 0) return;

    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      const newFiles: QueuedFile[] = allowed
        .filter((e) => !existing.has(e.path))
        .map((e) => ({
          id: `${e.path}-${Date.now()}`,
          path: e.path,
          name: e.name,
          duration: 0,
          status: "queued" as FileStatus,
        }));
      return [...prev, ...newFiles];
    });
  }, []);

  useEffect(() => {
    const unlistenPromise = getCurrentWebviewWindow().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragging(true);
      } else if (event.payload.type === "leave") {
        setIsDragging(false);
      } else if (event.payload.type === "drop") {
        setIsDragging(false);
        const entries = event.payload.paths.map((p) => ({
          path: p,
          name: p.split(/[/\\]/).pop() || p,
        }));
        addEntries(entries);
      }
    });
    return () => { unlistenPromise.then((fn) => fn()); };
  }, [addEntries]);

  const handleOpenDialog = useCallback(async () => {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "Audio",
          extensions: ["wav", "mp3"],
        },
      ],
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    const entries = paths.map((p) => ({
      path: p,
      name: p.split(/[/\\]/).pop() || p,
    }));
    addEntries(entries);
  }, [addEntries]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const transcribeAll = useCallback(async () => {
    const pending = files.filter((f) => f.status === "queued");
    if (pending.length === 0) return;

    for (const item of pending) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id ? { ...f, status: "transcribing" as FileStatus } : f,
        ),
      );

      try {
        const result = await commands.transcribeAudioFile(item.path);
        if (result.status === "ok") {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: "done" as FileStatus,
                    text: result.data.text,
                    duration: result.data.duration_sec,
                  }
                : f,
            ),
          );
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id
                ? { ...f, status: "error" as FileStatus, error: result.error }
                : f,
            ),
          );
        }
      } catch (err: unknown) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: "error" as FileStatus,
                  error: String(err),
                }
              : f,
          ),
        );
      }
    }
  }, [files]);

  const copyText = useCallback((text: string) => {
    navigator.clipboard.writeText(formatCopyText(text, copyFormat));
    toast.success(t("transcribeFile.copy"));
  }, [t, copyFormat]);

  const pendingCount = files.filter((f) => f.status === "queued").length;
  const isTranscribing = files.some((f) => f.status === "transcribing");

  return (
    <div className="flex flex-col gap-4 h-full">
      <div
        onClick={handleOpenDialog}
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors py-12 ${
          isDragging
            ? "border-logo-primary bg-logo-primary/5"
            : "border-mid-gray/30 hover:border-mid-gray/50 hover:bg-mid-gray/5"
        }`}
      >
        <Upload className="w-8 h-8 text-mid-gray/50" />
        <p className="text-sm text-text/60">
          {t("transcribeFile.dropHint")}
        </p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
          {files.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-mid-gray/20 bg-background-ui/5 p-4"
            >
              <div className="flex items-center gap-3">
                <FileAudio className="w-5 h-5 text-mid-gray/60 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-text/50">
                    {item.duration > 0
                      ? formatDuration(item.duration)
                      : item.name.split(".").pop()?.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === "queued" && (
                    <span className="text-xs text-text/40">
                      {t("transcribeFile.queued")}
                    </span>
                  )}
                  {item.status === "transcribing" && (
                    <Loader2 className="w-4 h-4 text-logo-primary animate-spin" />
                  )}
                  {item.status === "done" && item.text && (
                    <>
                      <button
                        onClick={() => copyText(item.text!)}
                        className="p-1.5 rounded-lg hover:bg-mid-gray/10 text-text/60 hover:text-text transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFile(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-text/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {item.status === "error" && (
                    <button
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {item.status === "done" && item.text && (
                <div className="bg-mid-gray/5 rounded-lg p-3">
                  <p className="text-sm text-text/80 whitespace-pre-wrap break-words">
                    {item.text}
                  </p>
                </div>
              )}

              {item.status === "error" && item.error && (
                <div className="bg-red-500/5 rounded-lg p-3">
                  <p className="text-xs text-red-400">{item.error}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-text/40">{t("transcribeFile.noFiles")}</p>
        </div>
      )}

      {pendingCount > 0 && (
        <div className="shrink-0">
          <button
            onClick={transcribeAll}
            disabled={isTranscribing}
            className="w-full py-3 rounded-xl bg-logo-primary text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("transcribeFile.transcribing")}
              </>
            ) : (
              t("transcribeFile.transcribeAll", { count: pendingCount })
            )}
          </button>
        </div>
      )}
    </div>
  );
};
