import { listen } from "@tauri-apps/api/event";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  MicrophoneIcon,
  TranscriptionIcon,
  CancelIcon,
} from "../components/icons";
import "./RecordingOverlay.css";
import { commands } from "@/bindings";
import i18n, { syncLanguageFromSettings } from "@/i18n";
import { getLanguageDirection } from "@/lib/utils/rtl";

type OverlayState = "recording" | "transcribing" | "processing";

const RecordingOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [state, setState] = useState<OverlayState>("recording");
  const [levels, setLevels] = useState<number[]>(Array(16).fill(0));
  const smoothedLevelsRef = useRef<number[]>(Array(16).fill(0));
  const direction = getLanguageDirection(i18n.language);

  useEffect(() => {
    const applyOverlayTheme = (themeName?: string) => {
      const theme =
        themeName ||
        localStorage.getItem("yukey_app_theme") ||
        "theme-zen-natural";
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
    };

    applyOverlayTheme();

    const setupEventListeners = async () => {
      // Listen for global theme-changed event
      const unlistenTheme = await listen<string>("theme-changed", (event) => {
        applyOverlayTheme(event.payload);
      });

      // Listen for show-overlay event from Rust
      const unlistenShow = await listen("show-overlay", async (event) => {
        applyOverlayTheme();
        // Sync language from settings each time overlay is shown
        await syncLanguageFromSettings();
        const overlayState = event.payload as OverlayState;
        setState(overlayState);
        setIsVisible(true);
      });

      // Listen for hide-overlay event from Rust
      const unlistenHide = await listen("hide-overlay", () => {
        setIsVisible(false);
      });

      // Listen for mic-level updates
      const unlistenLevel = await listen<number[]>("mic-level", (event) => {
        const newLevels = event.payload as number[];

        // Apply smoothing to reduce jitter
        const smoothed = smoothedLevelsRef.current.map((prev, i) => {
          const target = newLevels[i] || 0;
          return prev * 0.7 + target * 0.3; // Smooth transition
        });

        smoothedLevelsRef.current = smoothed;
        setLevels(smoothed.slice(0, 9));
      });

      // Cleanup function
      return () => {
        unlistenTheme();
        unlistenShow();
        unlistenHide();
        unlistenLevel();
      };
    };

    const cleanupPromise = setupEventListeners();
    return () => {
      cleanupPromise.then((cleanup) => cleanup());
    };
  }, []);

  const getIcon = () => {
    if (state === "recording") {
      return <MicrophoneIcon color="currentColor" />;
    } else {
      return <TranscriptionIcon color="currentColor" />;
    }
  };

  return (
    <div
      dir={direction}
      className={`recording-overlay ${isVisible ? "fade-in" : ""}`}
    >
      <div className="overlay-left">{getIcon()}</div>

      <div className="overlay-middle">
        {state === "recording" && (
          <div className="bars-container">
            {levels.map((v, i) => (
              <div
                key={i}
                className="bar"
                style={{
                  height: `${Math.min(20, 4 + Math.pow(v, 0.7) * 16)}px`, // Cap at 20px max height
                  transition: "height 60ms ease-out, opacity 120ms ease-out",
                  opacity: Math.max(0.2, v * 1.7), // Minimum opacity for visibility
                }}
              />
            ))}
          </div>
        )}
        {state === "transcribing" && (
          <div className="transcribing-text">{t("overlay.transcribing")}</div>
        )}
        {state === "processing" && (
          <div className="transcribing-text">{t("overlay.processing")}</div>
        )}
      </div>

      <div className="overlay-right">
        {state === "recording" && (
          <div
            className="cancel-button"
            onClick={() => {
              commands.cancelOperation();
            }}
          >
            <CancelIcon color="currentColor" />
          </div>
        )}
      </div>
    </div>
  );
};

export default RecordingOverlay;
