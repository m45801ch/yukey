import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ask } from "@tauri-apps/plugin-dialog";
import { ChevronDown, Globe, RefreshCw, Search, Copy, Check, Eye, EyeOff, CheckCircle } from "lucide-react";
import i18n from "../../../i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { Dropdown } from "../../ui/Dropdown";
import { toast } from "sonner";
import type { ModelCardStatus } from "@/components/onboarding";
import { ModelCard } from "@/components/onboarding";
import { useModelStore } from "@/stores/modelStore";
import {
  CHINESE_TRANSLATIONS,
  getLanguageLabel,
  MODEL_CAPABILITY_LANGUAGES,
  supportsLanguageCode,
} from "@/lib/constants/languages.ts";
import type { ModelInfo } from "@/bindings";

// check if model supports a language based on its supported_languages list
const modelSupportsLanguage = (model: ModelInfo, langCode: string): boolean => {
  return supportsLanguageCode(model.supported_languages, langCode);
};

// Legacy models are the blob (Url-sourced) .bin/ONNX downloads, superseded by
// the catalog GGUFs. They stay runnable when already on disk, but we no longer
// advertise the download. GGUF files are the modern format and excluded.
const isLegacyModel = (model: ModelInfo): boolean =>
  typeof model.source === "object"
    && "Url" in model.source
    && !model.filename.endsWith(".gguf");

export const ModelsSettings: React.FC = () => {
  const { t } = useTranslation();
  const { settings, updateCloudAsrSetting, verifyCloudAsrConnection, fetchCloudAsrModels } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<"local" | "cloud">("local");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPullingModels, setIsPullingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isManualModelInput, setIsManualModelInput] = useState(false);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast.success(t("settings.models.cloud.copied", "Copied to clipboard!"));
  };

  const handleApiKeyChange = async (value: string) => {
    await updateCloudAsrSetting("api_key", value);
    const provider = settings?.cloud_asr?.provider || "groq";
    const currentKeys = { ...(settings?.cloud_asr?.api_keys || {}) };
    currentKeys[provider] = value;
    await updateCloudAsrSetting("api_keys", currentKeys);
  };

  const handleProviderChange = async (provider: string) => {
    await updateCloudAsrSetting("provider", provider);
    let defaultUrl = "";
    let defaultModel = "";
    if (provider === "groq") {
      defaultUrl = "https://api.groq.com/openai/v1";
      defaultModel = "whisper-large-v3";
    } else if (provider === "openai") {
      defaultUrl = "https://api.openai.com/v1";
      defaultModel = "whisper-1";
    } else if (provider === "openrouter") {
      defaultUrl = "https://openrouter.ai/api/v1";
      defaultModel = "openai/whisper-large-v3";
    } else if (provider === "cloudflare") {
      defaultUrl = "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/openai/whisper";
      defaultModel = "@cf/openai/whisper";
    } else if (provider === "deepgram") {
      defaultUrl = "https://api.deepgram.com/v1/listen";
      defaultModel = "nova-2";
    }
    await updateCloudAsrSetting("base_url", defaultUrl);
    await updateCloudAsrSetting("model", defaultModel);
    
    // Load saved API Key for the newly selected provider
    const savedKeys = settings?.cloud_asr?.api_keys || {};
    const savedKey = savedKeys[provider] || "";
    await updateCloudAsrSetting("api_key", savedKey);

    setFetchedModels([]);
    setIsManualModelInput(false);
  };

  const handlePullModels = async () => {
    setIsPullingModels(true);
    try {
      const models = await fetchCloudAsrModels();
      if (models && models.length > 0) {
        setFetchedModels(models);
        toast.success(t("settings.models.cloud.pullSuccess", "Models pulled successfully!"));
      } else {
        toast.error(t("settings.models.cloud.pullFailed", "Failed to pull models. Please check your API key and base URL."));
      }
    } catch (e) {
      toast.error(t("settings.models.cloud.pullError", "An error occurred while pulling models."));
    } finally {
      setIsPullingModels(false);
    }
  };

  const handleVerifyConnection = async () => {
    setIsVerifying(true);
    try {
      const success = await verifyCloudAsrConnection();
      if (success) {
        toast.success(t("settings.models.cloud.verifySuccess", "Connection verified successfully!"));
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      toast.error(`${t("settings.models.cloud.verifyFailed", "Connection verification failed.")} (${errorMsg})`);
    } finally {
      setIsVerifying(false);
    }
  };

  const [switchingModelId, setSwitchingModelId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const languageSearchInputRef = useRef<HTMLInputElement>(null);

  // Sorting state and dropdown state
  const [sortBy, setSortBy] = useState<"name" | "accuracy" | "speed" | "size">("name");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const getSortLabel = (type: string) => {
    switch (type) {
      case "name": return t("pages.models.sortName");
      case "accuracy": return t("pages.models.sortAccuracy");
      case "speed": return t("pages.models.sortSpeed");
      case "size": return t("pages.models.sortSize");
      default: return "";
    }
  };

  const {
    models,
    currentModel,
    downloadingModels,
    downloadProgress,
    downloadStats,
    verifyingModels,
    extractingModels,
    loading,
    isRescanning,
    downloadModel,
    cancelDownload,
    selectModel,
    deleteModel,
    rescanLocalModels,
  } = useModelStore();

  // click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setLanguageDropdownOpen(false);
        setLanguageSearch("");
      }
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setSortDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // focus search input when dropdown opens
  useEffect(() => {
    if (languageDropdownOpen && languageSearchInputRef.current) {
      languageSearchInputRef.current.focus();
    }
  }, [languageDropdownOpen]);

  // filtered languages for dropdown (exclude "auto")
  const filteredLanguages = useMemo(() => {
    const query = languageSearch.toLowerCase();
    return MODEL_CAPABILITY_LANGUAGES.filter((lang) => {
      if (lang.label.toLowerCase().includes(query)) return true;
      if (i18n.language.startsWith("zh")) {
        const chineseName = CHINESE_TRANSLATIONS[lang.value];
        if (chineseName && chineseName.toLowerCase().includes(query)) return true;
      }
      return false;
    });
  }, [languageSearch]);

  // Get selected language label
  const selectedLanguageLabel = useMemo(() => {
    if (languageFilter === "all") {
      return t("settings.models.filters.allLanguages");
    }
    return getLanguageLabel(languageFilter) || "";
  }, [languageFilter, t]);

  const getModelStatus = (modelId: string): ModelCardStatus => {
    if (modelId in extractingModels) {
      return "extracting";
    }
    if (modelId in verifyingModels) {
      return "verifying";
    }
    if (modelId in downloadingModels) {
      return "downloading";
    }
    if (switchingModelId === modelId) {
      return "switching";
    }
    if (modelId === currentModel) {
      return "active";
    }
    const model = models.find((m: ModelInfo) => m.id === modelId);
    if (model?.is_downloaded) {
      return "available";
    }
    return "downloadable";
  };

  const getDownloadProgress = (modelId: string): number | undefined => {
    const progress = downloadProgress[modelId];
    return progress?.percentage;
  };

  const getDownloadSpeed = (modelId: string): number | undefined => {
    const stats = downloadStats[modelId];
    return stats?.speed;
  };

  const handleModelSelect = async (modelId: string) => {
    setSwitchingModelId(modelId);
    try {
      await selectModel(modelId);
    } finally {
      setSwitchingModelId(null);
    }
  };

  const handleModelDownload = async (modelId: string) => {
    await downloadModel(modelId);
  };

  const handleModelDelete = async (modelId: string) => {
    const model = models.find((m: ModelInfo) => m.id === modelId);
    const modelName = model?.name || modelId;
    const isActive = modelId === currentModel;

    const confirmed = await ask(
      isActive
        ? t("settings.models.deleteActiveConfirm", { modelName })
        : t("settings.models.deleteConfirm", { modelName }),
      {
        title: t("settings.models.deleteTitle"),
        kind: "warning",
      },
    );

    if (confirmed) {
      try {
        await deleteModel(modelId);
      } catch (err) {
        console.error(`Failed to delete model ${modelId}:`, err);
      }
    }
  };

  const handleModelCancel = async (modelId: string) => {
    try {
      await cancelDownload(modelId);
    } catch (err) {
      console.error(`Failed to cancel download for ${modelId}:`, err);
    }
  };

  // Filter models by search query (name + description) and language filter, then sort them
  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = models.filter((model: ModelInfo) => {
      // Hide deprecated legacy (.bin/ONNX) downloads unless already on disk.
      if (isLegacyModel(model) && !model.is_downloaded) return false;
      if (languageFilter !== "all") {
        if (!modelSupportsLanguage(model, languageFilter)) return false;
      }
      if (q) {
        const haystack = `${model.name} ${model.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "accuracy") {
        return b.accuracy_score - a.accuracy_score;
      }
      if (sortBy === "speed") {
        return b.speed_score - a.speed_score;
      }
      if (sortBy === "size") {
        return b.size_mb - a.size_mb;
      }
      return 0;
    });

    return filtered;
  }, [models, languageFilter, searchQuery, sortBy]);

  // Split filtered models into downloaded (including custom) and available sections
  const { downloadedModels, availableModels } = useMemo(() => {
    const downloaded: ModelInfo[] = [];
    const available: ModelInfo[] = [];

    for (const model of filteredModels) {
      if (
        model.is_custom ||
        model.is_downloaded ||
        model.id in downloadingModels ||
        model.id in extractingModels
      ) {
        downloaded.push(model);
      } else {
        available.push(model);
      }
    }

    // Sort: active model first, then non-custom, then custom at the bottom
    downloaded.sort((a, b) => {
      if (a.id === currentModel) return -1;
      if (b.id === currentModel) return 1;
      if (a.is_custom !== b.is_custom) return a.is_custom ? 1 : -1;
      return 0;
    });

    return {
      downloadedModels: downloaded,
      availableModels: available,
    };
  }, [filteredModels, downloadingModels, extractingModels, currentModel]);

  if (loading) {
    return (
      <div className="max-w-3xl w-full mx-auto">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-logo-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl w-full mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-xl font-semibold mb-2">
          {t("settings.models.title")}
        </h1>
        <p className="text-sm text-text/60">
          {t("settings.models.description")}
        </p>
      </div>

      {/* Tab bar (Segmented Button Control) */}
      <div className="inline-flex p-1 bg-mid-gray/10 border border-mid-gray/20 rounded-xl mb-6 max-w-xs w-full">
        <button
          type="button"
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "local"
              ? "bg-logo-primary text-white shadow-sm"
              : "text-text/60 hover:text-text"
          }`}
          onClick={() => setActiveTab("local")}
        >
          {t("settings.models.tabs.local", "Local Models")}
        </button>
        <button
          type="button"
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
            activeTab === "cloud"
              ? "bg-logo-primary text-white shadow-sm"
              : "text-text/60 hover:text-text"
          }`}
          onClick={() => setActiveTab("cloud")}
        >
          {t("settings.models.tabs.cloud", "Cloud Model")}
        </button>
      </div>

      {activeTab === "local" ? (
        <>
          {/* Search bar — filter the catalog by name or description */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("settings.models.searchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-mid-gray/10 border border-mid-gray/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-logo-primary placeholder:text-text/40"
            />
          </div>

          {filteredModels.length > 0 ? (
            <div className="space-y-6">
              {/* Downloaded Models Section — header always visible so filter stays accessible */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-medium text-text/60">
                    {t("settings.models.yourModels")}
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* Rescan local sources for models added outside yukey */}
                    <button
                      type="button"
                      onClick={() => rescanLocalModels()}
                      disabled={isRescanning}
                      title={t("settings.models.rescan.tooltip")}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-mid-gray/10 text-text/60 hover:bg-mid-gray/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isRescanning ? "animate-spin" : ""}`}
                      />
                      <span>{t("settings.models.rescan.label")}</span>
                    </button>
                    {/* Sorting dropdown */}
                    <div className="relative font-normal" ref={sortDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-mid-gray/10 text-text/60 hover:bg-mid-gray/20 transition-colors cursor-pointer"
                      >
                        <span className="truncate">{t("pages.models.sortPrefix")}{getSortLabel(sortBy)}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            sortDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {sortDropdownOpen && (
                        <div className="absolute top-full right-0 mt-1 w-44 bg-background border border-mid-gray/80 rounded-lg shadow-lg z-50 overflow-hidden">
                          <div className="py-1 flex flex-col">
                            {[
                              { value: "name", label: t("pages.models.sortName") },
                              { value: "accuracy", label: t("pages.models.sortAccuracy") },
                              { value: "speed", label: t("pages.models.sortSpeed") },
                              { value: "size", label: t("pages.models.sortSize") },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  setSortBy(opt.value as any);
                                  setSortDropdownOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-start text-xs transition-colors hover:bg-mid-gray/10 cursor-pointer ${
                                  sortBy === opt.value
                                    ? "text-logo-primary font-semibold bg-logo-primary/5"
                                    : "text-text/80"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Language filter dropdown */}
                    <div className="relative" ref={languageDropdownRef}>
                      <button
                        type="button"
                        onClick={() =>
                          setLanguageDropdownOpen(!languageDropdownOpen)
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                          languageFilter !== "all"
                            ? "bg-logo-primary/20 text-logo-primary"
                            : "bg-mid-gray/10 text-text/60 hover:bg-mid-gray/20"
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span className="max-w-[120px] truncate">
                          {selectedLanguageLabel}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            languageDropdownOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {languageDropdownOpen && (
                        <div className="absolute top-full right-0 mt-1 w-56 bg-background border border-mid-gray/80 rounded-lg shadow-lg z-50 overflow-hidden">
                          <div className="p-2 border-b border-mid-gray/40">
                            <input
                              ref={languageSearchInputRef}
                              type="text"
                              value={languageSearch}
                              onChange={(e) => setLanguageSearch(e.target.value)}
                              onKeyDown={(e) => {
                                if (
                                  e.key === "Enter" &&
                                  filteredLanguages.length > 0
                                ) {
                                  setLanguageFilter(filteredLanguages[0].value);
                                  setLanguageDropdownOpen(false);
                                  setLanguageSearch("");
                                } else if (e.key === "Escape") {
                                  setLanguageDropdownOpen(false);
                                  setLanguageSearch("");
                                }
                              }}
                              placeholder={t(
                                "settings.general.language.searchPlaceholder",
                              )}
                              className="w-full px-2 py-1 text-sm bg-mid-gray/10 border border-mid-gray/40 rounded-md focus:outline-none focus:ring-1 focus:ring-logo-primary"
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto overflow-x-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setLanguageFilter("all");
                                setLanguageDropdownOpen(false);
                                setLanguageSearch("");
                              }}
                              className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                                languageFilter === "all"
                                  ? "bg-logo-primary/20 text-logo-primary font-semibold"
                                  : "hover:bg-mid-gray/10"
                              }`}
                            >
                              {t("settings.models.filters.allLanguages")}
                            </button>
                            {filteredLanguages.map((lang) => (
                              <button
                                key={lang.value}
                                type="button"
                                onClick={() => {
                                  setLanguageFilter(lang.value);
                                  setLanguageDropdownOpen(false);
                                  setLanguageSearch("");
                                }}
                                className={`w-full px-3 py-1.5 text-sm text-left transition-colors ${
                                  languageFilter === lang.value
                                    ? "bg-logo-primary/20 text-logo-primary font-semibold"
                                    : "hover:bg-mid-gray/10"
                                }`}
                              >
                                {getLanguageLabel(lang.value, i18n.language) || lang.label}
                              </button>
                            ))}
                            {filteredLanguages.length === 0 && (
                              <div className="px-3 py-2 text-sm text-text/50 text-center">
                                {t("settings.general.language.noResults")}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {downloadedModels.map((model: ModelInfo) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    status={getModelStatus(model.id)}
                    onSelect={handleModelSelect}
                    onDownload={handleModelDownload}
                    onDelete={handleModelDelete}
                    onCancel={handleModelCancel}
                    downloadProgress={getDownloadProgress(model.id)}
                    downloadSpeed={getDownloadSpeed(model.id)}
                    showRecommended={false}
                  />
                ))}
              </div>

              {/* Available Models Section */}
              {availableModels.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-medium text-text/60">
                    {t("settings.models.availableModels")}
                  </h2>
                  {availableModels.map((model: ModelInfo) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      status={getModelStatus(model.id)}
                      onSelect={handleModelSelect}
                      onDownload={handleModelDownload}
                      onDelete={handleModelDelete}
                      onCancel={handleModelCancel}
                      downloadProgress={getDownloadProgress(model.id)}
                      downloadSpeed={getDownloadSpeed(model.id)}
                      showRecommended={true}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-text/50">
              {t("settings.models.noModelsMatch")}
            </div>
          )}
        </>
      ) : (
        /* Cloud Model Configurations Panel */
        <div className="p-5 bg-mid-gray/5 border border-mid-gray/30 rounded-xl space-y-5">
          {/* Enabled toggle */}
          <div className="flex items-center justify-between pb-3 border-b border-mid-gray/20">
            <div>
              <h3 className="text-sm font-medium text-text">
                {t("settings.models.cloud.enable.label", "Use Cloud Model for Transcription")}
              </h3>
              <p className="text-xs text-text/50 mt-0.5">
                {t("settings.models.cloud.enable.description", "Enable to route ASR to cloud provider instead of local Whisper.")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => updateCloudAsrSetting("enabled", !settings?.cloud_asr?.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings?.cloud_asr?.enabled ? "bg-logo-primary" : "bg-mid-gray/40"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings?.cloud_asr?.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="space-y-4">
            {/* Provider selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text/60">
                {t("settings.models.cloud.provider", "ASR Provider")}
              </label>
              <Dropdown
                options={[
                  { value: "groq", label: t("settings.models.cloud.providerOption.groq", "Groq (Free ASR Tier)") },
                  { value: "openai", label: t("settings.models.cloud.providerOption.openai", "OpenAI (ASR Compatible)") },
                  { value: "openrouter", label: t("settings.models.cloud.providerOption.openrouter", "OpenRouter (Whisper & Multi-model)") },
                  { value: "cloudflare", label: t("settings.models.cloud.providerOption.cloudflare", "Cloudflare (Workers AI)") },
                  { value: "deepgram", label: t("settings.models.cloud.providerOption.deepgram", "Deepgram (Credit Free Tier)") },
                ]}
                selectedValue={settings?.cloud_asr?.provider || "groq"}
                onSelect={(val) => handleProviderChange(val)}
                className="w-full"
              />
            </div>

            {/* API Key */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text/60">
                {t("settings.models.cloud.apiKey", "API Key")}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={settings?.cloud_asr?.api_key || ""}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder={t("settings.models.cloud.apiKeyPlaceholder", "Enter your API Key")}
                    className="w-full px-3 py-2 pr-10 text-sm bg-mid-gray/10 border border-mid-gray/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-logo-primary placeholder:text-text/30 text-text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text/40 hover:text-text transition-colors cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.cloud_asr?.api_key || "", "api_key")}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-mid-gray/10 text-text/75 hover:bg-mid-gray/20 transition-colors flex items-center justify-center cursor-pointer"
                  title={t("settings.models.cloud.copy", "Copy API Key")}
                >
                  {copiedField === "api_key" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Base URL / Endpoint */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-text/60">
                {t("settings.models.cloud.baseUrl", "API Base URL / Endpoint")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings?.cloud_asr?.base_url || ""}
                  onChange={(e) => updateCloudAsrSetting("base_url", e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="flex-1 px-3 py-2 text-sm bg-mid-gray/10 border border-mid-gray/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-logo-primary placeholder:text-text/30 text-text"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.cloud_asr?.base_url || "", "base_url")}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-mid-gray/10 text-text/75 hover:bg-mid-gray/20 transition-colors flex items-center justify-center cursor-pointer"
                  title={t("settings.models.cloud.copy", "Copy Endpoint")}
                >
                  {copiedField === "base_url" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Model Name Selector/Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-text/60">
                  {t("settings.models.cloud.model", "Model Name")}
                </label>
                {fetchedModels.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsManualModelInput(!isManualModelInput)}
                    className="text-xs text-logo-primary hover:underline font-medium cursor-pointer"
                  >
                    {isManualModelInput 
                      ? t("settings.models.cloud.selectFromPulled", "Select from pulled list") 
                      : t("settings.models.cloud.manualInput", "Manual Text Input")
                    }
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {!isManualModelInput && fetchedModels.length > 0 ? (
                  <Dropdown
                    options={fetchedModels.map((m) => ({ value: m, label: m }))}
                    selectedValue={settings?.cloud_asr?.model || ""}
                    onSelect={(val) => updateCloudAsrSetting("model", val)}
                    className="flex-1"
                  />
                ) : (
                  <input
                    type="text"
                    value={settings?.cloud_asr?.model || ""}
                    onChange={(e) => updateCloudAsrSetting("model", e.target.value)}
                    placeholder="whisper-large-v3"
                    className="flex-1 px-3 py-2 text-sm bg-mid-gray/10 border border-mid-gray/40 rounded-lg focus:outline-none focus:ring-1 focus:ring-logo-primary placeholder:text-text/30 text-text"
                  />
                )}
                <button
                  type="button"
                  onClick={() => copyToClipboard(settings?.cloud_asr?.model || "", "model")}
                  className="px-3 py-2 text-sm font-medium rounded-lg bg-mid-gray/10 text-text/75 hover:bg-mid-gray/20 transition-colors flex items-center justify-center cursor-pointer"
                  title={t("settings.models.cloud.copy", "Copy Model Name")}
                >
                  {copiedField === "model" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Actions: Pull Models and Verify Connection */}
            <div className="flex gap-3 pt-3 border-t border-mid-gray/10">
              <button
                type="button"
                onClick={handlePullModels}
                disabled={isPullingModels || !settings?.cloud_asr?.api_key}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-logo-primary/10 text-logo-primary hover:bg-logo-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isPullingModels ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {t("settings.models.cloud.pullButton", "Pull ASR Models")}
              </button>

              <button
                type="button"
                onClick={handleVerifyConnection}
                disabled={isVerifying || !settings?.cloud_asr?.api_key}
                className="flex-1 py-2 text-sm font-medium rounded-lg bg-logo-primary text-white hover:bg-logo-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isVerifying ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {t("settings.models.cloud.verifyButton", "Verify Connection")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
