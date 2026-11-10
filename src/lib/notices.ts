/**
 * Persistent background failures shown in the footer notice chip/panel.
 *
 * Toast messages in App.tsx are transient; these notices stay until the user
 * dismisses them, so a failure that happens while the window is in the
 * background is still visible afterwards. The codes below mirror the error
 * events the Rust side already emits (see src-tauri/src/actions.rs).
 */

export type NoticeLevel = "error" | "warning";

export interface Notice {
  id: string;
  code: string;
  level: NoticeLevel;
  titleKey: string;
  bodyKey?: string;
  detail?: string;
  at: number;
}

interface NoticeDefinition {
  code: string;
  level: NoticeLevel;
  titleKey: string;
  bodyKey?: string;
}

const DEFINITIONS: Record<string, NoticeDefinition> = {
  "transcription-error": {
    code: "transcriptionFailed",
    level: "error",
    titleKey: "errors.transcriptionFailedTitle",
  },
  "paste-error": {
    code: "pasteFailed",
    level: "error",
    titleKey: "errors.pasteFailedTitle",
    bodyKey: "errors.pasteFailed",
  },
  "post-process-error": {
    code: "postProcessFailed",
    level: "warning",
    titleKey: "errors.postProcessFailedTitle",
    bodyKey: "errors.postProcessFailed",
  },
  "post-process-config-error": {
    code: "postProcessConfig",
    level: "warning",
    titleKey: "errors.postProcessFailedTitle",
  },
  "cloud-asr-fallback": {
    code: "cloudAsrFallback",
    level: "warning",
    titleKey: "errors.cloudAsrFailedTitle",
  },
};

const CONFIG_BODY_KEYS: Record<string, string> = {
  no_provider: "errors.noProvider",
  no_model: "errors.noModel",
  no_api_key: "errors.noApiKey",
};

const CLOUD_ASR_BODY_KEYS: Record<string, string> = {
  no_api_key: "errors.cloudAsrFallback.no_api_key",
  network_error: "errors.cloudAsrFallback.network_error",
};

export const NOTICE_EVENTS = Object.keys(DEFINITIONS);

export function noticeFromEvent(event: string, payload: unknown): Notice | null {
  const definition = DEFINITIONS[event];
  if (!definition) return null;

  const detail = typeof payload === "string" ? payload : undefined;
  let bodyKey = definition.bodyKey;

  if (event === "post-process-config-error" && detail) {
    bodyKey = CONFIG_BODY_KEYS[detail] ?? definition.bodyKey;
  } else if (event === "cloud-asr-fallback" && detail) {
    bodyKey = CLOUD_ASR_BODY_KEYS[detail] ?? definition.bodyKey;
  }

  return {
    id: `${definition.code}:${Date.now()}`,
    code: definition.code,
    level: definition.level,
    titleKey: definition.titleKey,
    bodyKey,
    detail:
      event === "post-process-config-error" || event === "cloud-asr-fallback"
        ? undefined
        : detail,
    at: Date.now(),
  };
}
