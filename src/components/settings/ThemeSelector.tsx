import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { emit } from "@tauri-apps/api/event";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import {
  applyYukeyTheme,
  readThemeSelection,
  watchSystemTheme,
  SYSTEM_THEME,
  type ThemeSelection,
} from "@/lib/utils/yukeyTheme";

interface ThemeSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const [currentTheme, setCurrentTheme] =
      useState<ThemeSelection>("theme-zen-natural");

    useEffect(() => {
      const selection = readThemeSelection();
      setCurrentTheme(selection);
      const resolved = applyYukeyTheme();
      emit("theme-changed", resolved).catch((err) => {
        console.error("Failed to emit theme-changed on mount:", err);
      });
    }, []);

    // When "跟隨系統" is selected, re-apply (and notify the overlay) whenever
    // the OS flips between light and dark.
    useEffect(
      () =>
        watchSystemTheme((resolved) => {
          if (readThemeSelection() === SYSTEM_THEME) {
            emit("theme-changed", resolved).catch(() => {});
          }
        }),
      [],
    );

    const handleThemeChange = (value: string) => {
      const selection = value as ThemeSelection;
      setCurrentTheme(selection);
      localStorage.setItem("yukey_app_theme", selection);
      const resolved = applyYukeyTheme();
      emit("theme-changed", resolved).catch((err) => {
        console.error("Failed to emit theme-changed on change:", err);
      });
    };

    const themeOptions = [
      { value: "theme-premium-light", label: "🌸 現代優雅 (粉霧微漸層)" },
      { value: "theme-dark-tech", label: "🎛️ 科技極簡 (深靛藍高對比)" },
      { value: "theme-zen-natural", label: "🍵 自然治癒 (苔綠與燕麥)" },
      {
        value: SYSTEM_THEME,
        label: t("settings.general.theme.system"),
      },
    ];

    return (
      <SettingContainer
        title="外觀主題"
        description="選擇軟體的介面主題設計模板 (包含科技極簡、優雅粉霧與自然治癒風格，或跟隨系統亮暗)"
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <div className="flex items-center gap-1.5">
          <Dropdown
            options={themeOptions}
            selectedValue={currentTheme}
            onSelect={handleThemeChange}
          />
        </div>
      </SettingContainer>
    );
  },
);

ThemeSelector.displayName = "ThemeSelector";
