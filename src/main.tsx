import React from "react";
import ReactDOM from "react-dom/client";
import { platform } from "@tauri-apps/plugin-os";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Set platform before render so CSS can scope per-platform (e.g. scrollbar styles)
try {
  document.documentElement.dataset.platform = platform();
} catch {
  document.documentElement.dataset.platform = "unknown";
}

// Initialize theme from localStorage
(() => {
  const theme = localStorage.getItem("yukey_app_theme") || "theme-zen-natural";
  const root = document.documentElement;
  root.classList.remove(
    "theme-dark-tech",
    "theme-premium-light",
    "theme-zen-natural",
  );
  root.classList.add(theme);

  if (theme === "theme-dark-tech") {
    root.style.colorScheme = "dark";
  } else {
    root.style.colorScheme = "light";
  }
})();

// Initialize i18n
import "./i18n";

// Initialize model store (loads models and sets up event listeners)
import { useModelStore } from "./stores/modelStore";
useModelStore.getState().initialize();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
