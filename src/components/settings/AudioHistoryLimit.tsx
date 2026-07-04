import React from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../../hooks/useSettings";
import { Input } from "../ui/Input";
import { SettingContainer } from "../ui/SettingContainer";

interface AudioHistoryLimitProps {
  descriptionMode?: "tooltip" | "inline";
  grouped?: boolean;
}

export const AudioHistoryLimit: React.FC<AudioHistoryLimitProps> = ({
  descriptionMode = "inline",
  grouped = false,
}) => {
  const { t } = useTranslation();
  const { getSetting, updateSetting } = useSettings();

  const audioHistoryLimit = getSetting("audio_history_limit") ?? 5;
  const [localValue, setLocalValue] = React.useState(String(audioHistoryLimit));

  // Sync with outer setting if changed elsewhere
  React.useEffect(() => {
    setLocalValue(String(audioHistoryLimit));
  }, [audioHistoryLimit]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
  };

  const handleBlur = () => {
    let value = parseInt(localValue, 10);
    if (!isNaN(value)) {
      if (value < 0) value = 0;
      if (value > 999) value = 999;
      setLocalValue(String(value));
      updateSetting("audio_history_limit", value);
    } else {
      setLocalValue(String(audioHistoryLimit));
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  };

  return (
    <SettingContainer
      title={t("settings.debug.audioHistoryLimit.title")}
      description={t("settings.debug.audioHistoryLimit.description")}
      descriptionMode={descriptionMode}
      grouped={grouped}
      layout="horizontal"
    >
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          min="0"
          max="999"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-20"
        />
        <span className="text-sm text-text">
          {t("settings.debug.audioHistoryLimit.entries")}
        </span>
      </div>
    </SettingContainer>
  );
};
