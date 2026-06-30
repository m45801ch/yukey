import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { AppDataDirectory } from "../AppDataDirectory";
import { AppLanguageSelector } from "../AppLanguageSelector";
import { LogDirectory } from "../debug";

export const AboutSettings: React.FC = () => {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("0.1.2");
      }
    };

    fetchVersion();
  }, []);

  const handleDonateClick = async () => {
    try {
      await openUrl("https://handy.computer/donate");
    } catch (error) {
      console.error("Failed to open donate link:", error);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.about.title")}>
        <SettingContainer
          title={t("settings.about.version.title")}
          description={t("settings.about.version.description")}
          grouped={true}
        >
          {/* eslint-disable-next-line i18next/no-literal-string */}
          <span className="text-sm font-mono font-semibold text-logo-primary">v0.1.0</span>
        </SettingContainer>

        <SettingContainer
          title={t("settings.about.sourceCode.title")}
          description="檢視 yukey 專案的開源原始碼與開發進度。"
          grouped={true}
        >
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => openUrl("https://github.com/m45801ch/yukey")}
            >
              GitHub 原始碼
            </Button>
          </div>
        </SettingContainer>

        <AppDataDirectory descriptionMode="tooltip" grouped={true} />
        <LogDirectory grouped={true} />
      </SettingsGroup>

      <SettingsGroup title="授權與致謝">
        <SettingContainer
          title="致謝原創專案 (Handy)"
          description="本專案 yukey 係基於原作者 CJ Pais 的優秀開源專案 Handy 進行衍生與深度客製修改。我們由衷感謝原作者的開源精神與對本機語音轉文字應用的卓越技術架構貢獻。"
          grouped={true}
          layout="stacked"
        >
          <div className="text-sm text-mid-gray flex flex-col gap-1 mt-1">
            <span>• 原始專案作者：CJ Pais</span>
            <span>• 授權條款：MIT License</span>
            <span className="text-xs text-mid-gray/80 mt-1 font-mono">Copyright (c) 2025 CJ Pais</span>
          </div>
        </SettingContainer>
      </SettingsGroup>
    </div>
  );
};
