import React from "react";
import ReactDOM from "react-dom/client";
import { platform } from "@tauri-apps/plugin-os";
import App from "./App";
import { installCompatShims } from "./lib/compat";
import {
  applyYukeyTheme,
  readThemeSelection,
  watchSystemTheme,
  SYSTEM_THEME,
} from "./lib/utils/yukeyTheme";
import { emit } from "@tauri-apps/api/event";

installCompatShims();

// Set platform before render so CSS can scope per-platform (e.g. scrollbar styles)
document.documentElement.dataset.platform = platform();

// Apply theme on startup and follow OS light/dark changes when "system" is picked.
applyYukeyTheme();
watchSystemTheme((resolved) => {
  if (readThemeSelection() === SYSTEM_THEME) {
    emit("theme-changed", resolved).catch(() => {});
  }
});

// Initialize i18n
import "./i18n";

// Initialize model store (loads models and sets up event listeners)
import { useModelStore } from "./stores/modelStore";
import { useNoticeStore } from "./stores/noticeStore";
useModelStore.getState().initialize();
useNoticeStore.getState().initialize();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
