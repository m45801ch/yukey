/* eslint-disable i18next/no-literal-string */
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Button } from "../../ui/Button";
import { AppDataDirectory } from "../AppDataDirectory";
import { AppLanguageSelector } from "../AppLanguageSelector";
import { ShowWhatsNewOnUpdate } from "../ShowWhatsNewOnUpdate";
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

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.about.title")}>
        <AppLanguageSelector descriptionMode="tooltip" grouped={true} />
        <SettingContainer
          title={t("settings.about.version.title")}
          description={t("settings.about.version.description")}
          grouped={true}
        >
          <span className="text-sm font-mono">v{version}</span>
        </SettingContainer>

        <SettingContainer
          title={t("settings.about.sourceCode.title")}
          description="檢視 yukey 專案的開源原始碼與開發進度。"
          grouped={true}
        >
          <Button
            variant="secondary"
            size="md"
            onClick={() => openUrl("https://github.com/m45801ch/yukey")}
          >
            GitHub 原始碼
          </Button>
        </SettingContainer>

        <AppDataDirectory descriptionMode="tooltip" grouped={true} />
        <LogDirectory grouped={true} />
      </SettingsGroup>

      <SettingsGroup title={t("settings.about.acknowledgments.title")}>
        <SettingContainer
          title="致謝原創專案 (Handy)"
          description="本專案 yukey 係基於原作者 CJ Pais 的優秀開源專案 Handy 進行衍生與深度客製修改。我們由衷感謝原作者的開源精神與對本機語音轉文字應用的卓越技術架構貢獻。"
          grouped={true}
          layout="stacked"
        >
          <div className="text-sm text-mid-gray flex flex-col gap-1 mt-1">
            <span>• 原始專案作者：CJ Pais</span>
            <span>• 授權條款：MIT License</span>
            <span className="text-xs text-mid-gray/80 mt-1 font-mono">
              Copyright (c) 2025 CJ Pais
            </span>
          </div>
        </SettingContainer>
        <SettingContainer
          title={t("settings.about.acknowledgments.ggml.title")}
          description={t("settings.about.acknowledgments.ggml.description")}
          grouped={true}
          layout="stacked"
        >
          <div className="text-sm text-mid-gray">
            {t("settings.about.acknowledgments.ggml.details")}
          </div>
        </SettingContainer>
      </SettingsGroup>
    </div>
  );
};
