import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { emit } from "@tauri-apps/api/event";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";

interface ThemeSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

type ThemeType = "theme-premium-light" | "theme-dark-tech" | "theme-zen-natural";

export const ThemeSelector: React.FC<ThemeSelectorProps> = React.memo(
  ({ descriptionMode = "tooltip", grouped = false }) => {
    const { t } = useTranslation();
    const [currentTheme, setCurrentTheme] = useState<ThemeType>("theme-zen-natural");

    // On mount, read current theme from localStorage
    useEffect(() => {
      const theme = (localStorage.getItem("yukey_app_theme") || "theme-zen-natural") as ThemeType;
      setCurrentTheme(theme);
      applyTheme(theme);
      emit("theme-changed", theme).catch((err) => {
        console.error("Failed to emit theme-changed on mount:", err);
      });
    }, []);

    const applyTheme = (theme: ThemeType) => {
      const root = document.documentElement;
      
      // 移除所有可能存在的自訂主題 class
      root.classList.remove("theme-dark-tech", "theme-premium-light", "theme-zen-natural");
      
      // 套用選取的主題 class
      root.classList.add(theme);
      
      // 設定瀏覽器原生色彩模式
      if (theme === "theme-dark-tech") {
        root.style.colorScheme = "dark";
      } else {
        root.style.colorScheme = "light";
      }
    };

    const handleThemeChange = (value: string) => {
      const theme = value as ThemeType;
      setCurrentTheme(theme);
      localStorage.setItem("yukey_app_theme", theme);
      applyTheme(theme);
      emit("theme-changed", theme).catch((err) => {
        console.error("Failed to emit theme-changed on change:", err);
      });
    };

    const themeOptions = [
      { value: "theme-premium-light", label: "🌸 現代優雅 (粉霧微漸層)" },
      { value: "theme-dark-tech", label: "🎛️ 科技極簡 (深靛藍高對比)" },
      { value: "theme-zen-natural", label: "🍵 自然治癒 (苔綠與燕麥)" },
    ];

    return (
      <SettingContainer
        title="外觀主題"
        description="選擇軟體的介面主題設計模板 (包含科技極簡、優雅粉霧與自然治癒風格)"
        descriptionMode={descriptionMode}
        grouped={grouped}
      >
        <div className="flex items-center gap-1.5">
          <Dropdown
            options={themeOptions}
            selectedValue={currentTheme}
            onSelect={handleThemeChange}
          />
          <div className="w-[32px] flex-shrink-0" />
        </div>
      </SettingContainer>
    );
  }
);

ThemeSelector.displayName = "ThemeSelector";
