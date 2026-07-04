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
      { value: "en", label: "English (英文)" },
      { value: "zh-TW", label: "Traditional Chinese (繁體中文)" },
      { value: "zh-CN", label: "Simplified Chinese (簡體中文)" },
      { value: "ja", label: "Japanese (日文)" },
      { value: "ko", label: "Korean (韓文)" },
      { value: "es", label: "Spanish (西班牙文)" },
      { value: "fr", label: "French (法文)" },
      { value: "de", label: "German (德文)" },
    ];

    if (supportsNativeTranslation) {
      // Case 1: Local model supports translation.
      // Show "使用雲端服務翻譯" switch and indented "翻譯的目標" dropdown.
      const targetLangDisabled = !translateUsingLlm;
      const switchDescription = translateUsingLlm
        ? t("settings.advanced.translateUsingLlm.description")
        : t(
            "settings.advanced.translateUsingLlm.localSupportedDesc",
            "預設使用本地模型將語音翻譯為英文，開啟以切換為雲端服務大模型進行多國語言翻譯。",
          );

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
