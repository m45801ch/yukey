import React from "react";
import { useTranslation } from "react-i18next";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Slider } from "../ui/Slider";
import { useSettings } from "../../hooks/useSettings";

interface MicrophoneGainProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
}

export const MicrophoneGain: React.FC<MicrophoneGainProps> = ({
  descriptionMode = "tooltip",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const gainEnabled = getSetting("microphone_gain_enabled") ?? false;
  const gainValue = getSetting("microphone_gain_value") ?? 2.5;

  return (
    <>
      <ToggleSwitch
        checked={gainEnabled}
        onChange={(enabled) => updateSetting("microphone_gain_enabled", enabled)}
        isUpdating={isUpdating("microphone_gain_enabled")}
        label={t("settings.sound.microphone.gainLabel")}
        description={t("settings.sound.microphone.gainTooltip")}
        descriptionMode={descriptionMode}
        grouped={grouped}
      />
      {gainEnabled && (
        <div className="animate-fade-in pl-4">
          <Slider
            value={gainValue}
            onChange={(value) => updateSetting("microphone_gain_value", value)}
            min={1.0}
            max={10.0}
            step={0.1}
            label={t("settings.sound.microphone.gainValueLabel")}
            description=""
            descriptionMode="inline"
            grouped={grouped}
            formatValue={(value) => `${value.toFixed(1)}x`}
          />
        </div>
      )}
    </>
  );
};
export default MicrophoneGain;
