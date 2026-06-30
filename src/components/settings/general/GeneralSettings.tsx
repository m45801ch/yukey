import React from "react";
import { useTranslation } from "react-i18next";
import { type } from "@tauri-apps/plugin-os";
import { MicrophoneSelector } from "../MicrophoneSelector";
import { ShortcutInput } from "../ShortcutInput";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { OutputDeviceSelector } from "../OutputDeviceSelector";
import { PushToTalk } from "../PushToTalk";
import { AudioFeedback } from "../AudioFeedback";
import { useSettings } from "../../../hooks/useSettings";
import { VolumeSlider } from "../VolumeSlider";
import { MuteWhileRecording } from "../MuteWhileRecording";
import { ModelSettingsCard } from "./ModelSettingsCard";
import { AppLanguageSelector } from "../AppLanguageSelector";
import { ThemeSelector } from "../ThemeSelector";
import { LanguageSelector } from "../LanguageSelector";
import { useModelStore } from "../../../stores/modelStore";
import type { ModelInfo } from "@/bindings";

export const GeneralSettings: React.FC = () => {
  const { t } = useTranslation();
  const { audioFeedbackEnabled, getSetting } = useSettings();
  const { currentModel, models } = useModelStore();
  const pushToTalk = getSetting("push_to_talk");
  const isLinux = type() === "linux";

  const currentModelInfo = models.find((m: ModelInfo) => m.id === currentModel);
  const supportsLanguageSelection =
    currentModelInfo?.supports_language_selection ?? false;

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.general.title")}>
        <ShortcutInput shortcutId="transcribe" grouped={true} />
        <PushToTalk descriptionMode="tooltip" grouped={true} />
        {/* Cancel shortcut is hidden with push-to-talk (release key cancels) and on Linux (dynamic shortcut instability) */}
        {!isLinux && !pushToTalk && (
          <ShortcutInput shortcutId="cancel" grouped={true} />
        )}
      </SettingsGroup>

      <SettingsGroup title="語言">
        <AppLanguageSelector descriptionMode="tooltip" grouped={true} />
        {currentModel && currentModelInfo && supportsLanguageSelection && (
          <LanguageSelector
            descriptionMode="tooltip"
            grouped={true}
            supportedLanguages={currentModelInfo.supported_languages}
          />
        )}
      </SettingsGroup>

      <ModelSettingsCard />

      <SettingsGroup title={t("settings.sound.title")}>
        <MicrophoneSelector descriptionMode="tooltip" grouped={true} />
        <MuteWhileRecording descriptionMode="tooltip" grouped={true} />
        <AudioFeedback descriptionMode="tooltip" grouped={true} />
        <OutputDeviceSelector
          descriptionMode="tooltip"
          grouped={true}
          disabled={!audioFeedbackEnabled}
        />
        <VolumeSlider disabled={!audioFeedbackEnabled} />
      </SettingsGroup>

      <SettingsGroup title="外觀">
        <ThemeSelector descriptionMode="tooltip" grouped={true} />
      </SettingsGroup>
    </div>
  );
};
