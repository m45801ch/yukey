import { useCallback, useMemo, useState } from "react";
import { useSettings } from "../../../hooks/useSettings";
import { commands } from "@/bindings";
import type { PostProcessProvider, ApiKeyEntry } from "@/bindings";
import type { ModelOption } from "./types";
import type { DropdownOption } from "../../ui/Dropdown";

type PostProcessProviderState = {
  providerOptions: DropdownOption[];
  selectedProviderId: string;
  selectedProvider: PostProcessProvider | undefined;
  isCustomProvider: boolean;
  isAppleProvider: boolean;
  appleIntelligenceUnavailable: boolean;
  baseUrl: string;
  handleBaseUrlChange: (value: string) => void;
  isBaseUrlUpdating: boolean;
  apiKeyList: ApiKeyEntry[];
  apiKeyIndex: number;
  currentApiKey: string;
  dailyUsage: number[];
  handleApiKeyChange: (index: number, value: string) => void;
  handleApiKeyNoteChange: (index: number, note: string) => void;
  isApiKeyUpdating: (index: number) => boolean;
  isApiKeyNoteUpdating: (index: number) => boolean;
  handleAddApiKey: (apiKey: string) => void;
  handleRemoveApiKey: (index: number) => void;
  handleApiKeyIndexChange: (index: number) => void;
  autoSwitchModelEnabled: boolean;
  autoSwitchModelThreshold: number;
  isAutoSwitchModelEnabledUpdating: boolean;
  isAutoSwitchModelThresholdUpdating: boolean;
  handleAutoSwitchModelEnabledChange: (enabled: boolean) => void;
  handleAutoSwitchModelThresholdChange: (threshold: number) => void;
  model: string;
  handleModelChange: (value: string) => void;
  modelOptions: ModelOption[];
  isModelUpdating: boolean;
  isFetchingModels: boolean;
  handleProviderSelect: (providerId: string) => void;
  handleModelSelect: (value: string) => void;
  handleModelCreate: (value: string) => void;
  handleRefreshModels: () => void;
};

const APPLE_PROVIDER_ID = "apple_intelligence";

export const usePostProcessProviderState = (): PostProcessProviderState => {
  const {
    settings,
    isUpdating,
    setPostProcessProvider,
    updatePostProcessBaseUrl,
    updatePostProcessApiKey,
    updatePostProcessApiKeyNote,
    addPostProcessApiKey,
    removePostProcessApiKey,
    changePostProcessApiKeyIndex,
    updatePostProcessAutoSwitchModelEnabled,
    updatePostProcessAutoSwitchModelThreshold,
    updatePostProcessModel,
    fetchPostProcessModels,
    postProcessModelOptions,
  } = useSettings();

  // Settings are guaranteed to have providers after migration
  const providers = settings?.post_process_providers || [];

  const selectedProviderId = useMemo(() => {
    return settings?.post_process_provider_id || providers[0]?.id || "openai";
  }, [providers, settings?.post_process_provider_id]);

  const selectedProvider = useMemo(() => {
    return (
      providers.find((provider) => provider.id === selectedProviderId) ||
      providers[0]
    );
  }, [providers, selectedProviderId]);

  const isAppleProvider = selectedProvider?.id === APPLE_PROVIDER_ID;
  const [appleIntelligenceUnavailable, setAppleIntelligenceUnavailable] =
    useState(false);

  // Use settings directly as single source of truth
  const baseUrl = selectedProvider?.base_url ?? "";
  const apiKeyList = settings?.post_process_api_key_list?.[selectedProviderId] ?? [];
  const apiKeyIndex = settings?.post_process_api_key_index?.[selectedProviderId] ?? 0;
  const dailyUsage = settings?.post_process_api_key_daily_usage?.[selectedProviderId] ?? [];
  const currentApiKey = apiKeyList[apiKeyIndex]?.key ?? "";
  const model = settings?.post_process_models?.[selectedProviderId] ?? "";
  const autoSwitchModelEnabled = settings?.post_process_auto_switch_model_enabled ?? false;
  const autoSwitchModelThreshold = settings?.post_process_auto_switch_model_threshold ?? 10;

  const providerOptions = useMemo<DropdownOption[]>(() => {
    return providers.map((provider) => ({
      value: provider.id,
      label: provider.label,
    }));
  }, [providers]);

  const handleProviderSelect = useCallback(
    async (providerId: string) => {
      // Clear error state on any selection attempt (allows dismissing the error)
      setAppleIntelligenceUnavailable(false);

      if (providerId === selectedProviderId) return;

      // Check Apple Intelligence availability before selecting
      if (providerId === APPLE_PROVIDER_ID) {
        const available = await commands.checkAppleIntelligenceAvailable();
        if (!available) {
          setAppleIntelligenceUnavailable(true);
          // Don't return - still set the provider so dropdown shows the selection
          // The backend gracefully handles unavailable Apple Intelligence
        }
      }

      await setPostProcessProvider(providerId);

      // Auto-fetch available models for the new provider so the model dropdown
      // reflects what's actually valid. Without this, a stale model value from
      // a previous provider/base_url can persist and silently 404 at runtime.
      // Skip when the provider isn't configured yet (no API key / empty base URL)
      // to avoid unnecessary backend errors.
      if (providerId !== APPLE_PROVIDER_ID) {
        const provider = providers.find((p) => p.id === providerId);
        const apiKey = settings?.post_process_api_key_list?.[providerId]?.[0]?.key ?? "";
        const hasBaseUrl = (provider?.base_url ?? "").trim() !== "";
        const hasApiKey = apiKey.trim() !== "";

        if (provider?.id === "custom" ? hasBaseUrl : hasApiKey) {
          void fetchPostProcessModels(providerId);
        }
      }
    },
    [
      selectedProviderId,
      setPostProcessProvider,
      fetchPostProcessModels,
      providers,
      settings,
    ],
  );

  const handleBaseUrlChange = useCallback(
    (value: string) => {
      if (!selectedProvider || selectedProvider.id !== "custom") {
        return;
      }
      const trimmed = value.trim();
      if (trimmed && trimmed !== baseUrl) {
        void updatePostProcessBaseUrl(selectedProvider.id, trimmed);
      }
    },
    [selectedProvider, baseUrl, updatePostProcessBaseUrl],
  );

  const handleApiKeyChange = useCallback(
    (index: number, value: string) => {
      const trimmed = value.trim();
      if (trimmed !== apiKeyList[index]?.key) {
        void updatePostProcessApiKey(selectedProviderId, index, trimmed);
      }
    },
    [apiKeyList, selectedProviderId, updatePostProcessApiKey],
  );

  const handleApiKeyNoteChange = useCallback(
    (index: number, note: string) => {
      if (note !== apiKeyList[index]?.note) {
        void updatePostProcessApiKeyNote(selectedProviderId, index, note);
      }
    },
    [apiKeyList, selectedProviderId, updatePostProcessApiKeyNote],
  );

  const handleAddApiKey = useCallback(
    (apiKey: string) => {
      void addPostProcessApiKey(selectedProviderId, apiKey.trim());
    },
    [selectedProviderId, addPostProcessApiKey],
  );

  const handleRemoveApiKey = useCallback(
    (index: number) => {
      void removePostProcessApiKey(selectedProviderId, index);
    },
    [selectedProviderId, removePostProcessApiKey],
  );

  const handleApiKeyIndexChange = useCallback(
    (index: number) => {
      void changePostProcessApiKeyIndex(selectedProviderId, index);
    },
    [selectedProviderId, changePostProcessApiKeyIndex],
  );

  const isApiKeyUpdatingCallback = useCallback(
    (index: number) => {
      return isUpdating(`post_process_api_key:${selectedProviderId}:${index}`);
    },
    [isUpdating, selectedProviderId],
  );

  const isApiKeyNoteUpdatingCallback = useCallback(
    (index: number) => {
      return isUpdating(`post_process_api_key_note:${selectedProviderId}:${index}`);
    },
    [isUpdating, selectedProviderId],
  );

  const handleAutoSwitchModelEnabledChange = useCallback(
    (enabled: boolean) => {
      if (enabled !== autoSwitchModelEnabled) {
        void updatePostProcessAutoSwitchModelEnabled(enabled);
      }
    },
    [autoSwitchModelEnabled, updatePostProcessAutoSwitchModelEnabled],
  );

  const handleAutoSwitchModelThresholdChange = useCallback(
    (threshold: number) => {
      if (threshold !== autoSwitchModelThreshold) {
        void updatePostProcessAutoSwitchModelThreshold(threshold);
      }
    },
    [autoSwitchModelThreshold, updatePostProcessAutoSwitchModelThreshold],
  );

  const handleModelChange = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed !== model) {
        void updatePostProcessModel(selectedProviderId, trimmed);
      }
    },
    [model, selectedProviderId, updatePostProcessModel],
  );

  const handleModelSelect = useCallback(
    (value: string) => {
      void updatePostProcessModel(selectedProviderId, value.trim());
    },
    [selectedProviderId, updatePostProcessModel],
  );

  const handleModelCreate = useCallback(
    (value: string) => {
      void updatePostProcessModel(selectedProviderId, value);
    },
    [selectedProviderId, updatePostProcessModel],
  );

  const handleRefreshModels = useCallback(() => {
    if (isAppleProvider) return;
    void fetchPostProcessModels(selectedProviderId);
  }, [fetchPostProcessModels, isAppleProvider, selectedProviderId]);

  const availableModelsRaw = postProcessModelOptions[selectedProviderId] || [];

  const modelOptions = useMemo<ModelOption[]>(() => {
    const seen = new Set<string>();
    const options: ModelOption[] = [];

    const upsert = (value: string | null | undefined) => {
      const trimmed = value?.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      options.push({ value: trimmed, label: trimmed });
    };

    // Add available models from API
    for (const candidate of availableModelsRaw) {
      upsert(candidate);
    }

    // Ensure current model is in the list
    upsert(model);

    return options;
  }, [availableModelsRaw, model]);

  const isBaseUrlUpdating = isUpdating(
    `post_process_base_url:${selectedProviderId}`,
  );
  const isAutoSwitchModelEnabledUpdating = isUpdating(
    "post_process_auto_switch_model_enabled",
  );
  const isAutoSwitchModelThresholdUpdating = isUpdating(
    "post_process_auto_switch_model_threshold",
  );
  const isModelUpdating = isUpdating(
    `post_process_model:${selectedProviderId}`,
  );
  const isFetchingModels = isUpdating(
    `post_process_models_fetch:${selectedProviderId}`,
  );

  const isCustomProvider = selectedProvider?.id === "custom";

  // No automatic fetching - user must click refresh button

  return {
    providerOptions,
    selectedProviderId,
    selectedProvider,
    isCustomProvider,
    isAppleProvider,
    appleIntelligenceUnavailable,
    baseUrl,
    handleBaseUrlChange,
    isBaseUrlUpdating,
    apiKeyList,
    apiKeyIndex,
    currentApiKey,
    dailyUsage,
    handleApiKeyChange,
    handleApiKeyNoteChange,
    isApiKeyUpdating: isApiKeyUpdatingCallback,
    isApiKeyNoteUpdating: isApiKeyNoteUpdatingCallback,
    handleAddApiKey,
    handleRemoveApiKey,
    handleApiKeyIndexChange,
    autoSwitchModelEnabled,
    autoSwitchModelThreshold,
    isAutoSwitchModelEnabledUpdating,
    isAutoSwitchModelThresholdUpdating,
    handleAutoSwitchModelEnabledChange,
    handleAutoSwitchModelThresholdChange,
    model,
    handleModelChange,
    modelOptions,
    isModelUpdating,
    isFetchingModels,
    handleProviderSelect,
    handleModelSelect,
    handleModelCreate,
    handleRefreshModels,
  };
};
