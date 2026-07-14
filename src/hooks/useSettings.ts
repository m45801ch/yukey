import { useEffect } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { AppSettings as Settings, AudioDevice } from "@/bindings";

interface UseSettingsReturn {
  // State
  settings: Settings | null;
  isLoading: boolean;
  isUpdating: (key: string) => boolean;
  audioDevices: AudioDevice[];
  outputDevices: AudioDevice[];
  audioFeedbackEnabled: boolean;
  postProcessModelOptions: Record<string, string[]>;

  // Actions
  updateSetting: <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) => Promise<void>;
  resetSetting: (key: keyof Settings) => Promise<void>;
  refreshSettings: () => Promise<void>;
  refreshAudioDevices: () => Promise<void>;
  refreshOutputDevices: () => Promise<void>;

  // Binding-specific actions
  updateBinding: (id: string, binding: string) => Promise<void>;
  resetBinding: (id: string) => Promise<void>;

  // Convenience getters
  getSetting: <K extends keyof Settings>(key: K) => Settings[K] | undefined;

  // Post-processing helpers
  setPostProcessProvider: (providerId: string) => Promise<void>;
  updatePostProcessBaseUrl: (
    providerId: string,
    baseUrl: string,
  ) => Promise<void>;
  updatePostProcessApiKey: (
    providerId: string,
    index: number,
    apiKey: string,
  ) => Promise<void>;
  updatePostProcessApiKeyNote: (
    providerId: string,
    index: number,
    note: string,
  ) => Promise<void>;
  addPostProcessApiKey: (
    providerId: string,
    apiKey: string,
  ) => Promise<void>;
  removePostProcessApiKey: (
    providerId: string,
    index: number,
  ) => Promise<void>;
  changePostProcessApiKeyIndex: (
    providerId: string,
    index: number,
  ) => Promise<void>;
  updatePostProcessAutoSwitchModelEnabled: (enabled: boolean) => Promise<void>;
  updatePostProcessAutoSwitchModelThreshold: (threshold: number) => Promise<void>;
  updatePostProcessModel: (providerId: string, model: string) => Promise<void>;
  fetchPostProcessModels: (providerId: string) => Promise<string[]>;
  copyFormat: "plain" | "markdown";
  setCopyFormat: (format: "plain" | "markdown") => void;
}

export const useSettings = (): UseSettingsReturn => {
  const store = useSettingsStore();

  // Initialize on first mount
  useEffect(() => {
    if (store.isLoading) {
      store.initialize();
    }
  }, [store.initialize, store.isLoading]);

  return {
    settings: store.settings,
    isLoading: store.isLoading,
    isUpdating: store.isUpdatingKey,
    audioDevices: store.audioDevices,
    outputDevices: store.outputDevices,
    audioFeedbackEnabled: store.settings?.audio_feedback || false,
    postProcessModelOptions: store.postProcessModelOptions,
    updateSetting: store.updateSetting,
    resetSetting: store.resetSetting,
    refreshSettings: store.refreshSettings,
    refreshAudioDevices: store.refreshAudioDevices,
    refreshOutputDevices: store.refreshOutputDevices,
    updateBinding: store.updateBinding,
    resetBinding: store.resetBinding,
    getSetting: store.getSetting,
    setPostProcessProvider: store.setPostProcessProvider,
    updatePostProcessBaseUrl: store.updatePostProcessBaseUrl,
    updatePostProcessApiKey: store.updatePostProcessApiKey,
    updatePostProcessApiKeyNote: store.updatePostProcessApiKeyNote,
    addPostProcessApiKey: store.addPostProcessApiKey,
    removePostProcessApiKey: store.removePostProcessApiKey,
    changePostProcessApiKeyIndex: store.changePostProcessApiKeyIndex,
    updatePostProcessAutoSwitchModelEnabled: store.updatePostProcessAutoSwitchModelEnabled,
    updatePostProcessAutoSwitchModelThreshold: store.updatePostProcessAutoSwitchModelThreshold,
    updatePostProcessModel: store.updatePostProcessModel,
    fetchPostProcessModels: store.fetchPostProcessModels,
    copyFormat: store.copyFormat,
    setCopyFormat: store.setCopyFormat,
  };
};
