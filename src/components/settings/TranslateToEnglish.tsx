import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { useSettings } from "../../hooks/useSettings";

interface TranslateToEnglishProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  supportsNativeTranslation?: boolean;
}

export const TranslateToEnglish: React.FC<TranslateToEnglishProps> = React.memo(
  ({
    descriptionMode = "tooltip",
    grouped = false,
    supportsNativeTranslation = false,
  }) => {
    const { t } = useTranslation();
    const { getSetting, updateSetting, isUpdating } = useSettings();

    const translateUsingLlm = getSetting("translate_using_llm") || false;
    const translateTargetLanguage =
      getSetting("translate_target_language") || "en";

    const languageOptions = [
      { value: "en", label: t("pages.translate.languages.en") },
      { value: "zh-TW", label: t("pages.translate.languages.zh-TW") },
      { value: "zh-CN", label: t("pages.translate.languages.zh-CN") },
      { value: "ja", label: t("pages.translate.languages.ja") },
      { value: "ko", label: t("pages.translate.languages.ko") },
      { value: "es", label: t("pages.translate.languages.es") },
      { value: "fr", label: t("pages.translate.languages.fr") },
      { value: "de", label: t("pages.translate.languages.de") },
    ];

    if (supportsNativeTranslation) {
      // Case 1: Local model supports translation.
      // Show "使用雲端服務翻譯" switch and indented "翻譯的目標" dropdown.
      const targetLangDisabled = !translateUsingLlm;
      const switchDescription = translateUsingLlm
        ? t("settings.advanced.translateUsingLlm.description")
        : t("settings.advanced.translateUsingLlm.localSupportedDesc");

      return (
        <div className="flex flex-col gap-4 w-full">
          <ToggleSwitch
            checked={translateUsingLlm}
            onChange={(enabled) => {
              updateSetting("translate_using_llm", enabled);
              if (!enabled) {
                updateSetting("translate_target_language", "en");
              }
            }}
            isUpdating={isUpdating("translate_using_llm")}
            label={t("settings.advanced.translateUsingLlm.label")}
            description={switchDescription}
            descriptionMode={descriptionMode}
            grouped={grouped}
          />

          <div className="flex flex-col gap-4 pl-6 border-l-2 border-gray-200 dark:border-gray-800 w-full">
            <SettingContainer
              title={t("settings.advanced.translateTargetLanguage.label")}
              description={t(
                "settings.advanced.translateTargetLanguage.description",
              )}
              descriptionMode={descriptionMode}
              grouped={grouped}
            >
              <div className="flex items-center">
                <Dropdown
                  className="w-[260px]"
                  options={languageOptions}
                  selectedValue={
                    targetLangDisabled ? "en" : translateTargetLanguage
                  }
                  disabled={targetLangDisabled}
                  onSelect={(val) => {
                    if (val) {
                      updateSetting("translate_target_language", val);
                    }
                  }}
                />
              </div>
            </SettingContainer>
          </div>
        </div>
      );
    } else {
      // Case 2: Local model does NOT support translation.
      // Show "雲端服務翻譯" setting container and always-enabled dropdown on the right.
      return (
        <div className="w-full">
          <SettingContainer
            title={t("settings.advanced.cloudTranslation.label")}
            description={t("settings.advanced.cloudTranslation.description")}
            descriptionMode={descriptionMode}
            grouped={grouped}
          >
            <div className="flex items-center">
              <Dropdown
                className="w-[260px]"
                options={languageOptions}
                selectedValue={translateTargetLanguage}
                onSelect={(val) => {
                  if (val) {
                    updateSetting("translate_target_language", val);
                  }
                }}
              />
            </div>
          </SettingContainer>
        </div>
      );
    }
  },
);
