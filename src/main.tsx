import React from "react";
import ReactDOM from "react-dom/client";
import { platform } from "@tauri-apps/plugin-os";
import App from "./App";

// Set platform before render so CSS can scope per-platform (e.g. scrollbar styles)
document.documentElement.dataset.platform = platform();

// Apply theme on startup
const savedTheme = localStorage.getItem("yukey_app_theme") || "theme-zen-natural";
document.documentElement.classList.remove(
  "theme-dark-tech",
  "theme-premium-light",
  "theme-zen-natural"
);
document.documentElement.classList.add(savedTheme);
if (savedTheme === "theme-dark-tech") {
  document.documentElement.style.colorScheme = "dark";
} else {
  document.documentElement.style.colorScheme = "light";
}

// Initialize i18n
import "./i18n";

// Initialize model store (loads models and sets up event listeners)
import { useModelStore } from "./stores/modelStore";
useModelStore.getState().initialize();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
