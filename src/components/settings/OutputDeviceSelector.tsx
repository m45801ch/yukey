import React from "react";
import { useTranslation } from "react-i18next";
import { Dropdown } from "../ui/Dropdown";
import { SettingContainer } from "../ui/SettingContainer";
import { ResetButton } from "../ui/ResetButton";
import { useSettings } from "../../hooks/useSettings";
import type { AudioDevice } from "@/bindings";

interface OutputDeviceSelectorProps {
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  disabled?: boolean;
}

export const OutputDeviceSelector: React.FC<OutputDeviceSelectorProps> =
  React.memo(
    ({ descriptionMode = "tooltip", grouped = false, disabled = false }) => {
      const { t } = useTranslation();
      const {
        getSetting,
        updateSetting,
        resetSetting,
        isUpdating,
        isLoading,
        outputDevices,
        refreshOutputDevices,
      } = useSettings();

      const rawOutput = getSetting("selected_output_device") || "default";
      const selectedOutputDevice =
        rawOutput.toLowerCase() === "default" ? "系統預設" : rawOutput;

      const handleOutputDeviceSelect = async (deviceName: string) => {
        const value = deviceName === "系統預設" ? "default" : deviceName;
        await updateSetting("selected_output_device", value);
      };

      const handleReset = async () => {
        await resetSetting("selected_output_device");
      };

      const outputDeviceOptions = [
        { value: "系統預設", label: "系統預設" },
        ...outputDevices
          .filter((device) => device.name.toLowerCase() !== "default")
          .map((device: AudioDevice) => ({
            value: device.name,
            label: device.name,
          })),
      ];

      return (
        <SettingContainer
          title={t("settings.sound.outputDevice.title")}
          description={t("settings.sound.outputDevice.description")}
          descriptionMode={descriptionMode}
          grouped={grouped}
          disabled={disabled}
        >
          <div className="flex items-center space-x-1">
            <Dropdown
              options={outputDeviceOptions}
              selectedValue={selectedOutputDevice}
              onSelect={handleOutputDeviceSelect}
              placeholder={
                isLoading || outputDevices.length === 0
                  ? t("settings.sound.outputDevice.loading")
                  : t("settings.sound.outputDevice.placeholder")
              }
              disabled={
                disabled ||
                isUpdating("selected_output_device") ||
                isLoading ||
                outputDevices.length === 0
              }
              onRefresh={refreshOutputDevices}
            />
            <ResetButton
              onClick={handleReset}
              disabled={
                disabled || isUpdating("selected_output_device") || isLoading
              }
            />
          </div>
        </SettingContainer>
      );
    },
  );
