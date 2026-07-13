import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";
import { Plus, Edit2, Trash2, RotateCcw, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

import {
  PromptPluginSettings,
  loadPromptSettings,
  savePromptSettings,
  getAvailableMainPrompts,
  getAvailableModes,
  getAvailableDictionaries,
  buildPrompt,
  extractDictMetadata,
} from "@/prompt/prompt_builder";
import { exportBackupZip, importBackupZip } from "@/utils/backup";

export const StylePage: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, refreshSettings, isUpdating } =
    useSettings();

  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] =
    useState<PromptPluginSettings>(loadPromptSettings());

  // 用於新增/編輯模式或詞庫的對話方塊狀態
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingType, setEditingType] = useState<
    "main" | "mode" | "dict" | null
  >(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editorName, setEditorName] = useState("");
  const [editorDescription, setEditorDescription] = useState("");
  const [editorContent, setEditorContent] = useState("");

  const [expandedDict, setExpandedDict] = useState<string | null>(null);
  const [newEntryTerm, setNewEntryTerm] = useState("");
  const [newEntryExplanation, setNewEntryExplanation] = useState("");

  // 熱詞管理相關狀態
  const [newWord, setNewWord] = useState("");
  const customWords: string[] = getSetting("custom_words") || [];

  const tabs = [
    { name: t("pages.style.tabs.mainPrompt"), index: 0 },
    { name: t("pages.style.tabs.modes"), index: 1 },
    { name: t("pages.style.tabs.hotwords"), index: 2 },
    { name: t("pages.style.tabs.dicts"), index: 3 },
    { name: t("pages.style.tabs.customRules"), index: 4 },
    { name: t("pages.style.tabs.backup"), index: 5 },
  ];

  // 儲存設定並「立刻」套用編譯後的 Prompt 到後端
  const applyPromptSettings = async (
    newSettings: PromptPluginSettings,
    wordsList: string[] = customWords,
  ) => {
    savePromptSettings(newSettings);
    setSettings(newSettings);

    try {
      const finalPrompt = buildPrompt(newSettings, wordsList);
      const PLUGIN_PROMPT_NAME = "OpenLess Plugin System";
      const prompts = getSetting("post_process_prompts") || [];
      const existingPrompt = prompts.find((p) => p.name === PLUGIN_PROMPT_NAME);

      let backendPromptId = "";

      if (existingPrompt) {
        await commands.updatePostProcessPrompt(
          existingPrompt.id,
          PLUGIN_PROMPT_NAME,
          finalPrompt,
        );
        backendPromptId = existingPrompt.id;
      } else {
        const result = await commands.addPostProcessPrompt(
          PLUGIN_PROMPT_NAME,
          finalPrompt,
        );
        if (result.status === "ok") {
          backendPromptId = result.data.id;
        } else {
          throw new Error("Failed to create plugin prompt");
        }
      }

      await refreshSettings();
      await updateSetting("post_process_selected_prompt_id", backendPromptId);
    } catch (e) {
      console.error("Failed to auto-apply prompt settings", e);
    }
  };

  // 防抖 (Debounce) 自動套用自訂規則，避免打字時頻繁寫入後端
  useEffect(() => {
    const saved = loadPromptSettings();
    if (settings.customRules !== saved.customRules) {
      const handler = setTimeout(() => {
        applyPromptSettings(settings);
        toast.success(t("pages.style.toast.rulesAutoSaved"));
      }, 1000); // 停止輸入 1 秒後自動套用

      return () => clearTimeout(handler);
    }
  }, [settings.customRules]);

  // 切換展開的詞庫時清空輸入表單
  useEffect(() => {
    setNewEntryTerm("");
    setNewEntryExplanation("");
  }, [expandedDict]);

  const openEditor = (
    type: "main" | "mode" | "dict",
    key: string | null = null,
  ) => {
    setEditingType(type);
    setEditingKey(key);

    if (key) {
      if (type === "main") {
        const mains = getAvailableMainPrompts(settings);
        setEditorName(mains[key]?.name || "");
        setEditorDescription(mains[key]?.description || "");
        setEditorContent(mains[key]?.content || "");
      } else if (type === "mode") {
        const modes = getAvailableModes(settings);
        setEditorName(modes[key]?.name || "");
        setEditorDescription(modes[key]?.description || "");
        setEditorContent(modes[key]?.content || "");
      } else {
        const dicts = getAvailableDictionaries(settings);
        setEditorName(dicts[key]?.name || "");
        setEditorDescription(dicts[key]?.description || "");
        setEditorContent(dicts[key]?.content || "");
      }
    } else {
      setEditorName("");
      setEditorDescription("");
      setEditorContent("");
    }

    setEditorOpen(true);
  };

  const saveEditor = async () => {
    if (!editorName.trim() || !editorContent.trim()) return;

    const key = editingKey || `custom_${Date.now()}`;
    const newSettings = { ...settings };

    const itemData = {
      name: editorName.trim(),
      description: editorDescription.trim() || t("pages.style.descFallback", { name: editorName.trim() }),
      content: editorContent.trim(),
    };

    if (editingType === "main") {
      newSettings.customMainPrompts = {
        ...newSettings.customMainPrompts,
        [key]: itemData,
      };
    } else if (editingType === "mode") {
      newSettings.customModes = {
        ...newSettings.customModes,
        [key]: itemData,
      };
    } else if (editingType === "dict") {
      newSettings.customDictionaries = {
        ...newSettings.customDictionaries,
        [key]: itemData,
      };
    }

    setEditorOpen(false);
    await applyPromptSettings(newSettings);
    toast.success(t("pages.style.toast.changesApplied"));
  };

  const deleteCustomItem = async (
    type: "main" | "mode" | "dict",
    key: string,
  ) => {
    if (!confirm(t("pages.style.toast.confirmDelete"))) return;

    const newSettings = { ...settings };
    if (type === "main") {
      const { [key]: _, ...rest } = newSettings.customMainPrompts;
      newSettings.customMainPrompts = rest;
      if (newSettings.activeMainPrompt === key) {
        newSettings.activeMainPrompt = "default";
      }
    } else if (type === "mode") {
      const { [key]: _, ...rest } = newSettings.customModes;
      newSettings.customModes = rest;
      if (newSettings.activeMode === key) {
        newSettings.activeMode = "general";
      }
    } else {
      const { [key]: _, ...rest } = newSettings.customDictionaries;
      newSettings.customDictionaries = rest;
      newSettings.activeDictionaries = newSettings.activeDictionaries.filter(
        (k) => k !== key,
      );
    }
    await applyPromptSettings(newSettings);
    toast.success(t("pages.style.toast.itemDeleted"));
  };

  const resetDefaultItem = async (
    type: "main" | "mode" | "dict",
    key: string,
  ) => {
    if (!confirm(t("pages.style.toast.confirmReset"))) return;

    const newSettings = { ...settings };
    if (type === "main") {
      return;
    } else if (type === "mode") {
      const { [key]: _, ...rest } = newSettings.customModes;
      newSettings.customModes = rest;
    } else {
      const { [key]: _, ...rest } = newSettings.customDictionaries;
      newSettings.customDictionaries = rest;
    }
    await applyPromptSettings(newSettings);
    toast.success(t("pages.style.toast.resetDone"));
  };

  // 整合熱詞新增邏輯 (同步更新系統 settings 中的 custom_words，並立刻自動套用編譯)
  const handleAddWord = async () => {
    const trimmedWord = newWord.trim();
    const sanitizedWord = trimmedWord.replace(/[<>"'&]/g, "");
    if (
      sanitizedWord &&
      !sanitizedWord.includes(" ") &&
      sanitizedWord.length <= 50
    ) {
      if (customWords.includes(sanitizedWord)) {
        toast.error(t("pages.style.toast.wordExists", { word: sanitizedWord }));
        return;
      }
      const updated = [...customWords, sanitizedWord];
      await updateSetting("custom_words", updated);
      setNewWord("");
      await applyPromptSettings(settings, updated);
      toast.success(t("pages.style.toast.wordAdded"));
    }
  };

  // 整合熱詞刪除邏輯
  const handleRemoveWord = async (wordToRemove: string) => {
    const updated = customWords.filter((word) => word !== wordToRemove);
    await updateSetting("custom_words", updated);
    await applyPromptSettings(settings, updated);
    toast.success(t("pages.style.toast.wordRemoved"));
  };

  // 匯出壓縮包 ZIP
  const handleExport = async () => {
    await exportBackupZip(settings, customWords);
  };

  // 匯入還原壓縮包 ZIP
  const handleImport = async () => {
    const backup = await importBackupZip();
    if (backup) {
      await updateSetting("custom_words", backup.customWords);
      setSettings(backup.promptSettings);
      await applyPromptSettings(backup.promptSettings, backup.customWords);
    }
  };

  const handleAddEntry = async (dictKey: string) => {
    const term = newEntryTerm.trim();
    const explanation = newEntryExplanation.trim();
    if (!term || !explanation) return;

    const newSettings = { ...settings };
    const entries = newSettings.dictionaryCustomEntries[dictKey] || [];
    newSettings.dictionaryCustomEntries = {
      ...newSettings.dictionaryCustomEntries,
      [dictKey]: [...entries, { term, explanation }],
    };

    setNewEntryTerm("");
    setNewEntryExplanation("");
    await applyPromptSettings(newSettings);
    toast.success(t("pages.style.dicts.entryAdded"));
  };

  const handleDeleteEntry = async (dictKey: string, index: number) => {
    const newSettings = { ...settings };
    const entries = [...(newSettings.dictionaryCustomEntries[dictKey] || [])];
    entries.splice(index, 1);
    newSettings.dictionaryCustomEntries = {
      ...newSettings.dictionaryCustomEntries,
      [dictKey]: entries,
    };
    await applyPromptSettings(newSettings);
    toast.success(t("pages.style.dicts.entryDeleted"));
  };

  const isDefaultItem = (key: string | null) => {
    if (!key) return false;
    return (
      key === "default" ||
      key === "general" ||
      key === "business" ||
      key === "meeting" ||
      key === "verbatim" ||
      key === "chat" ||
      key === "email" ||
      key === "line" ||
      key === "social" ||
      key === "teaching" ||
      key === "notes" ||
      key === "official" ||
      key === "ai" ||
      key === "coding" ||
      key === "medical" ||
      key === "legal" ||
      key === "engineering" ||
      key === "education"
    );
  };

  return (
    <div className="w-full space-y-6 pb-8 select-none text-text">
      {/* 頂部標題（移除右上角儲存按鈕） */}
      <div className="text-start">
        <p className="text-xs text-mid-gray">
          {t("pages.style.description")}
        </p>
      </div>

      {/* Tabs 導航 */}
      <div className="flex border-b border-mid-gray/20">
        {tabs.map((tab) => (
          <button
            key={tab.index}
            onClick={() => setActiveTab(tab.index)}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.index
                ? "text-logo-primary border-b-2 border-logo-primary"
                : "text-mid-gray hover:text-text"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* 內容區塊 */}
      <div className="pt-2 text-start">
        {/* Tab 1: 主 Prompt */}
        {activeTab === 0 && (
          <div className="space-y-4 shadow-sm border border-mid-gray/10 rounded-xl p-4 bg-background-ui/5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold">{t("pages.style.mainPrompt.title")}</h3>
                <p className="text-xs text-mid-gray mt-1 font-medium text-logo-primary/80">
                  {t("pages.style.mainPrompt.hint")}
                </p>
              </div>
              <Button
                onClick={() => openEditor("main")}
                size="sm"
                variant="secondary"
                className="flex gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t("pages.style.mainPrompt.addButton")}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {Object.entries(getAvailableMainPrompts(settings)).map(
                ([key, main]) => {
                  const isActive = settings.activeMainPrompt === key;
                  const isDefault = key === "default";
                  return (
                    <div
                      key={key}
                      onClick={() =>
                        applyPromptSettings({
                          ...settings,
                          activeMainPrompt: key,
                        })
                      }
                      onDoubleClick={() => openEditor("main", key)}
                      title={t(isDefault ? "pages.style.mainPrompt.viewTooltip" : "pages.style.mainPrompt.editTooltip")}
                      className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all relative group min-h-28 ${
                        isActive
                          ? "border-logo-primary bg-logo-primary/5 border-[1.5px]"
                          : "border-mid-gray/20 hover:border-logo-primary/40 border"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">
                              {main.name}
                            </span>
                            <span className="text-[10px] px-1 py-0.2 bg-mid-gray/10 text-mid-gray rounded">
                              {t(isDefault ? "pages.style.mainPrompt.defaultBadge" : "pages.style.mainPrompt.customBadge")}
                            </span>
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold text-logo-primary bg-logo-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> {t("pages.style.mainPrompt.inUse")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-mid-gray line-clamp-3 leading-relaxed">
                          {main.description}
                        </p>
                      </div>

                      <div
                        className="flex gap-2 mt-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEditor("main", key)}
                          className="p-1 rounded hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary"
                          title={t(isDefault ? "pages.style.mainPrompt.viewAction" : "pages.style.mainPrompt.editAction")}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isDefault && (
                          <button
                            onClick={() => deleteCustomItem("main", key)}
                            className="p-1 rounded hover:bg-red-500/10 text-mid-gray hover:text-red-500"
                            title={t("pages.style.mainPrompt.deleteAction")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Tab 2: 修飾模式 */}
        {activeTab === 1 && (
          <div className="space-y-4 shadow-sm border border-mid-gray/10 rounded-xl p-4 bg-background-ui/5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold">{t("pages.style.modes.title")}</h3>
                <p className="text-xs text-mid-gray mt-1 font-medium text-logo-primary/80">
                  {t("pages.style.modes.hint")}
                </p>
              </div>
              <Button
                onClick={() => openEditor("mode")}
                size="sm"
                variant="secondary"
                className="flex gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t("pages.style.modes.addButton")}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {Object.entries(getAvailableModes(settings)).map(
                ([key, mode]) => {
                  const isActive = settings.activeMode === key;
                  const isCustom = key.startsWith("custom_");
                  const isModifiedDefault =
                    !isCustom && !!settings.customModes[key];
                  return (
                    <div
                      key={key}
                      onClick={() =>
                        applyPromptSettings({ ...settings, activeMode: key })
                      }
                      onDoubleClick={() => openEditor("mode", key)}
                      title={t("pages.style.modes.editTooltip")}
                      className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all relative group min-h-28 ${
                        isActive
                          ? "border-logo-primary bg-logo-primary/5 border-[1.5px]"
                          : "border-mid-gray/20 hover:border-logo-primary/40 border"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm">
                              {mode.name}
                            </span>
                            {!isCustom && (
                              <span className="text-[10px] px-1 py-0.2 bg-mid-gray/10 text-mid-gray rounded">
                                {t(isModifiedDefault ? "pages.style.modes.modifiedBadge" : "pages.style.modes.builtinBadge")}
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold text-logo-primary bg-logo-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> {t("pages.style.modes.inUse")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-mid-gray line-clamp-3 leading-relaxed">
                          {mode.description}
                        </p>
                      </div>

                      <div
                        className="flex gap-2 mt-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEditor("mode", key)}
                          className="p-1 rounded hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary"
                          title={t("pages.style.modes.editAction")}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isCustom ? (
                          <button
                            onClick={() => deleteCustomItem("mode", key)}
                            className="p-1 rounded hover:bg-red-500/10 text-mid-gray hover:text-red-500"
                            title={t("pages.style.modes.deleteAction")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          isModifiedDefault && (
                            <button
                              onClick={() => resetDefaultItem("mode", key)}
                              className="p-1 rounded hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary"
                              title={t("pages.style.modes.resetAction")}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Hotwords */}
        {activeTab === 2 && (
          <div className="space-y-4 shadow-sm border border-mid-gray/10 rounded-xl p-5 bg-background-ui/5">
            <div className="space-y-2 text-start">
              <h3 className="text-md font-bold text-logo-primary">
                {t("pages.style.hotwords.title")}
              </h3>
              <p className="text-xs text-mid-gray">
                {t("pages.style.hotwords.description")}
              </p>

              <div className="flex gap-2 max-w-lg pt-2">
                <Input
                  type="text"
                  className="flex-1"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                  placeholder={t("pages.style.hotwords.placeholder")}
                  variant="compact"
                  disabled={isUpdating("custom_words")}
                />
                <Button
                  onClick={handleAddWord}
                  disabled={
                    !newWord.trim() ||
                    newWord.includes(" ") ||
                    isUpdating("custom_words")
                  }
                  variant="primary"
                  size="md"
                >
                  {t("pages.style.hotwords.addButton")}
                </Button>
              </div>
            </div>

            <div className="min-h-36 max-h-60 overflow-y-auto p-4 rounded-xl border border-mid-gray/10 bg-mid-gray/5 flex flex-wrap gap-2 items-start content-start">
              {customWords.length === 0 ? (
                <span className="text-xs text-mid-gray py-8 w-full text-center">
                  {t("pages.style.hotwords.noHotwords")}
                </span>
              ) : (
                customWords.map((word) => (
                  <button
                    key={word}
                    onClick={() => handleRemoveWord(word)}
                    disabled={isUpdating("custom_words")}
                    className="px-2.5 py-1 rounded-lg text-xs bg-mid-gray/15 hover:bg-logo-primary/20 border border-mid-gray/20 hover:border-logo-primary/40 flex items-center gap-1.5 transition-colors cursor-pointer text-text"
                  >
                    <span>{word}</span>
                    <span className="text-[10px] text-mid-gray hover:text-logo-primary font-bold">
                      &times;
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 4: 專業詞庫 */}
        {activeTab === 3 && (
          <div className="space-y-4 shadow-sm border border-mid-gray/10 rounded-xl p-4 bg-background-ui/5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-md font-bold">{t("pages.style.dicts.title")}</h3>
                <p className="text-xs text-mid-gray mt-1 font-medium text-logo-primary/80">
                  {t("pages.style.dicts.hint")}
                </p>
              </div>
              <Button
                onClick={() => openEditor("dict")}
                size="sm"
                variant="secondary"
                className="flex gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> {t("pages.style.dicts.addButton")}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {Object.entries(getAvailableDictionaries(settings)).map(
                ([key, dict]) => {
                  const isActive = settings.activeDictionaries.includes(key);
                  const isCustom = key.startsWith("custom_");
                  const isModifiedDefault =
                    !isCustom && !!settings.customDictionaries[key];
                  return (
                    <div
                      key={key}
                      onClick={() => {
                        const newDicts = isActive
                          ? settings.activeDictionaries.filter((k) => k !== key)
                          : [...settings.activeDictionaries, key];
                        applyPromptSettings({
                          ...settings,
                          activeDictionaries: newDicts,
                        });
                      }}
                      onDoubleClick={() => openEditor("dict", key)}
                      title={t("pages.style.dicts.editTooltip")}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between group min-h-28 ${
                        isActive
                          ? "border-logo-primary bg-logo-primary/5 border-[1.5px]"
                          : "border-mid-gray/20 hover:border-logo-primary/40 border"
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center ${isActive ? "bg-logo-primary border-logo-primary text-white" : "border border-mid-gray"}`}
                            >
                              {isActive && (
                                <Check className="w-3 h-3 stroke-[3]" />
                              )}
                            </div>
                            <span className="font-bold text-sm">
                              {dict.name}
                            </span>
                            {!isCustom && (
                              <span className="text-[9px] px-1 py-0.2 bg-mid-gray/10 text-mid-gray rounded">
                                {t(isModifiedDefault ? "pages.style.dicts.modifiedBadge" : "pages.style.dicts.builtinBadge")}
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold text-logo-primary bg-logo-primary/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                               {t("pages.style.dicts.enabled")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-mid-gray pl-6 leading-relaxed line-clamp-3">
                          {dict.description}
                        </p>
                      </div>

                      <div
                        className="flex gap-2 mt-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEditor("dict", key)}
                          className="p-1 rounded hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary"
                          title={t("pages.style.dicts.editAction")}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isCustom ? (
                          <button
                            onClick={() => deleteCustomItem("dict", key)}
                            className="p-1 rounded hover:bg-red-500/10 text-mid-gray hover:text-red-500"
                            title={t("pages.style.dicts.deleteAction")}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          isModifiedDefault && (
                            <button
                              onClick={() => resetDefaultItem("dict", key)}
                              className="p-1 rounded hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary"
                              title={t("pages.style.dicts.resetAction")}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedDict(expandedDict === key ? null : key);
                          }}
                          className="p-1 rounded hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary"
                          title={expandedDict === key ? t("pages.style.dicts.collapse") : t("pages.style.dicts.expand")}
                        >
                          {expandedDict === key ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {expandedDict === key && (
                        <div className="mt-3 pt-3 border-t border-mid-gray/10 space-y-3" onClick={(e) => e.stopPropagation()}>
                          {/* Dictionary Content (read-only) */}
                          <div>
                            <h4 className="text-xs font-semibold text-mid-gray mb-1">{t("pages.style.dicts.title")}</h4>
                            <pre className="text-xs text-mid-gray bg-mid-gray/5 p-2 rounded max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                              {extractDictMetadata(dict.content).body}
                            </pre>
                          </div>

                          {/* Custom Entries Section */}
                          <div>
                            <h4 className="text-xs font-semibold text-mid-gray mb-1">{t("pages.style.dicts.customEntries")}</h4>

                            {/* Existing entries */}
                            <div className="space-y-1 mb-2">
                              {(settings.dictionaryCustomEntries[key] || []).length === 0 ? (
                                <p className="text-xs text-mid-gray/60 italic">{t("pages.style.dicts.noEntries")}</p>
                              ) : (
                                (settings.dictionaryCustomEntries[key] || []).map((entry, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs bg-mid-gray/5 px-2 py-1 rounded">
                                    <span className="font-semibold text-text">{entry.term}</span>
                                    <span className="text-mid-gray">→</span>
                                    <span className="text-text">{entry.explanation}</span>
                                    <button
                                      onClick={() => handleDeleteEntry(key, idx)}
                                      className="ml-auto text-mid-gray hover:text-red-500"
                                      title={t("pages.style.dicts.deleteEntry")}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Add new entry form */}
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newEntryTerm}
                                onChange={(e) => setNewEntryTerm(e.target.value)}
                                placeholder={t("pages.style.dicts.termLabel")}
                                className="flex-1 text-xs px-2 py-1 rounded border border-mid-gray/20 bg-transparent text-text outline-none focus:border-logo-primary"
                                onKeyDown={(e) => e.key === "Enter" && newEntryTerm.trim() && handleAddEntry(key)}
                              />
                              <input
                                type="text"
                                value={newEntryExplanation}
                                onChange={(e) => setNewEntryExplanation(e.target.value)}
                                placeholder={t("pages.style.dicts.explanationLabel")}
                                className="flex-1 text-xs px-2 py-1 rounded border border-mid-gray/20 bg-transparent text-text outline-none focus:border-logo-primary"
                                onKeyDown={(e) => e.key === "Enter" && newEntryExplanation.trim() && handleAddEntry(key)}
                              />
                              <button
                                onClick={() => handleAddEntry(key)}
                                disabled={!newEntryTerm.trim() || !newEntryExplanation.trim()}
                                className="text-xs px-2 py-1 rounded bg-logo-primary text-white disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {t("pages.style.dicts.addEntry")}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Tab 5: 自訂規則 */}
        {activeTab === 4 && (
          <div className="space-y-3 shadow-sm border border-mid-gray/10 rounded-xl p-4 bg-background-ui/5">
            <h3 className="text-md font-bold">{t("pages.style.customRules.title")}</h3>
            <p className="text-xs text-mid-gray">
              {t("pages.style.customRules.description")}
            </p>
            <Textarea
              value={settings.customRules}
              onChange={(e) => {
                setSettings({ ...settings, customRules: e.target.value });
              }}
              placeholder={t("pages.style.customRules.placeholder")}
              className="w-full h-40 text-sm"
            />
          </div>
        )}

        {/* Tab 6: 備份與還原 */}
        {activeTab === 5 && (
          <div className="space-y-4 shadow-sm border border-mid-gray/10 rounded-xl p-5 bg-background-ui/5">
            <div>
              <h3 className="text-md font-bold text-logo-primary">
                {t("pages.style.backup.title")}
              </h3>
              <p className="text-xs text-mid-gray mt-1">
                {t("pages.style.backup.description")}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleExport} variant="primary" size="md">
                <span>{t("pages.style.backup.exportButton")}</span>
              </Button>
              <Button onClick={handleImport} variant="secondary" size="md">
                <span>{t("pages.style.backup.importButton")}</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-background border border-mid-gray/20 rounded-2xl p-6 space-y-4 shadow-2xl text-start">
            <h3 className="text-md font-bold text-logo-primary border-b border-mid-gray/10 pb-2">
              {editingKey === "default"
                ? t("pages.style.editor.viewTitle")
                : editingKey
                  ? t(`pages.style.editor.editTitle${editingType === "main" ? "Main" : editingType === "mode" ? "Mode" : "Dict"}`)
                  : t(`pages.style.editor.newTitle${editingType === "main" ? "Main" : editingType === "mode" ? "Mode" : "Dict"}`)}
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-mid-gray">
                {t("pages.style.editor.nameLabel")}
              </label>
              <Input
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder={
                  editingType === "main"
                    ? t("pages.style.editor.namePlaceholderMain")
                    : editingType === "mode"
                      ? t("pages.style.editor.namePlaceholderMode")
                      : t("pages.style.editor.namePlaceholderDict")
                }
                className="w-full"
                disabled={isDefaultItem(editingKey)} // 內建/預設項目名稱不可修改
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-mid-gray">
                {t("pages.style.editor.descLabel")}
              </label>
              <Input
                value={editorDescription}
                onChange={(e) => setEditorDescription(e.target.value)}
                placeholder={t("pages.style.editor.descPlaceholder")}
                className="w-full text-sm"
                disabled={isDefaultItem(editingKey)} // 內建/預設項目描述不可修改
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-mid-gray">
                {t(editingType === "main"
                  ? "pages.style.editor.contentLabelMain"
                  : editingType === "mode"
                    ? "pages.style.editor.contentLabelMode"
                    : "pages.style.editor.contentLabelDict")}
              </label>
              <Textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="w-full h-48 text-sm leading-relaxed"
                placeholder={
                  editingType === "main"
                    ? t("pages.style.editor.contentPlaceholderMain")
                    : editingType === "mode"
                      ? t("pages.style.editor.contentPlaceholderMode")
                      : t("pages.style.editor.contentPlaceholderDict")
                }
                disabled={isDefaultItem(editingKey)} // 內建/預設項目內容不可修改
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              {isDefaultItem(editingKey) ? (
                <Button
                  onClick={() => setEditorOpen(false)}
                  variant="primary"
                  size="md"
                >
                  {t("pages.style.editor.closeButton")}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setEditorOpen(false)}
                    variant="secondary"
                    size="md"
                  >
                    {t("pages.style.editor.cancelButton")}
                  </Button>
                  <Button
                    onClick={saveEditor}
                    variant="primary"
                    size="md"
                    disabled={!editorName.trim() || !editorContent.trim()}
                  >
                    {t("pages.style.editor.saveButton")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
