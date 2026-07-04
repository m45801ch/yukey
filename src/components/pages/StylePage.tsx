import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";
import { Plus, Edit2, Trash2, RotateCcw, Check } from "lucide-react";
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

  // 熱詞管理相關狀態
  const [newWord, setNewWord] = useState("");
  const customWords: string[] = getSetting("custom_words") || [];

  const tabs = [
    { name: "主 Prompt", index: 0 },
    { name: "修飾模式", index: 1 },
    { name: "Hotwords", index: 2 },
    { name: "專業詞庫", index: 3 },
    { name: "自訂規則", index: 4 },
    { name: "備份與還原", index: 5 },
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
        toast.success("自訂規則已自動儲存套用！");
      }, 1000); // 停止輸入 1 秒後自動套用

      return () => clearTimeout(handler);
    }
  }, [settings.customRules]);

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
      description: editorDescription.trim() || `${editorName.trim()}說明。`,
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
    toast.success("變更已自動套用！");
  };

  const deleteCustomItem = async (
    type: "main" | "mode" | "dict",
    key: string,
  ) => {
    if (!confirm(`確定要刪除此項目嗎？`)) return;

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
    toast.success("項目已刪除並重新套用！");
  };

  const resetDefaultItem = async (
    type: "main" | "mode" | "dict",
    key: string,
  ) => {
    if (!confirm(`確定要將此預設項目恢復為原始出廠設定嗎？`)) return;

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
    toast.success("已還原預設設定並自動套用！");
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
        toast.error(`熱詞 "${sanitizedWord}" 已存在於清單中`);
        return;
      }
      const updated = [...customWords, sanitizedWord];
      await updateSetting("custom_words", updated);
      setNewWord("");
      await applyPromptSettings(settings, updated);
      toast.success("熱詞添加並套用成功");
    }
  };

  // 整合熱詞刪除邏輯
  const handleRemoveWord = async (wordToRemove: string) => {
    const updated = customWords.filter((word) => word !== wordToRemove);
    await updateSetting("custom_words", updated);
    await applyPromptSettings(settings, updated);
    toast.success("熱詞已移除並重新套用");
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

  const isDefaultItem = (key: string | null) => {
    if (!key) return false;
    return (
      key === "default" ||
      key === "general" ||
      key === "business" ||
      key === "meeting" ||
      key === "verbatim" ||
      key === "chat" ||
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
          透過模組化的設定，精確控制 AI
          語音轉文字的修飾行為與詞彙。所有變更均會自動儲存並即時生效。
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
                <h3 className="text-md font-bold">核心系統提示詞</h3>
                <p className="text-xs text-mid-gray mt-1 font-medium text-logo-primary/80">
                  提示：點擊卡片直接切換套用；按兩下卡片可觀看或編輯提示詞。
                </p>
              </div>
              <Button
                onClick={() => openEditor("main")}
                size="sm"
                variant="secondary"
                className="flex gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 新增主 Prompt
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
                      title={
                        isDefault ? "按兩下可觀看完整內容" : "按兩下可編輯內容"
                      }
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
                              {isDefault ? "預設唯讀" : "自訂"}
                            </span>
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold text-logo-primary bg-logo-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> 使用中
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
                          title={isDefault ? "觀看內容" : "編輯內容"}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isDefault && (
                          <button
                            onClick={() => deleteCustomItem("main", key)}
                            className="p-1 rounded hover:bg-red-500/10 text-mid-gray hover:text-red-500"
                            title="刪除"
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
                <h3 className="text-md font-bold">情境修飾模式</h3>
                <p className="text-xs text-mid-gray mt-1 font-medium text-logo-primary/80">
                  提示：點擊卡片直接切換套用；按兩下卡片可編輯內容
                </p>
              </div>
              <Button
                onClick={() => openEditor("mode")}
                size="sm"
                variant="secondary"
                className="flex gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 新增模式
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
                      title="按兩下可編輯內容"
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
                                {isModifiedDefault ? "已修改" : "內建"}
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold text-logo-primary bg-logo-primary/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Check className="w-3 h-3" /> 使用中
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
                          title="編輯內容"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isCustom ? (
                          <button
                            onClick={() => deleteCustomItem("mode", key)}
                            className="p-1 rounded hover:bg-red-500/10 text-mid-gray hover:text-red-500"
                            title="刪除模式"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          isModifiedDefault && (
                            <button
                              onClick={() => resetDefaultItem("mode", key)}
                              className="p-1 rounded hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary"
                              title="還原預設值"
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
                專屬熱詞管理
              </h3>
              <p className="text-xs text-mid-gray">
                輸入您常用的英文名詞、公司名稱、人名等。在此處變更將同步至「語音識別引擎（Whisper）」與「AI
                潤色提示詞」。
              </p>

              <div className="flex gap-2 max-w-lg pt-2">
                <Input
                  type="text"
                  className="flex-1"
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                  placeholder="例如：Kubernetes (不含空格)"
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
                  新增熱詞
                </Button>
              </div>
            </div>

            <div className="min-h-36 max-h-60 overflow-y-auto p-4 rounded-xl border border-mid-gray/10 bg-mid-gray/5 flex flex-wrap gap-2 items-start content-start">
              {customWords.length === 0 ? (
                <span className="text-xs text-mid-gray py-8 w-full text-center">
                  尚無新增的自訂熱詞，您可在此處或「詞彙字典」頁面中加入。
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
                <h3 className="text-md font-bold">專業領域詞庫</h3>
                <p className="text-xs text-mid-gray mt-1 font-medium text-logo-primary/80">
                  提示：點擊卡片直接勾選啟用；按兩下卡片可編輯詞彙內容
                </p>
              </div>
              <Button
                onClick={() => openEditor("dict")}
                size="sm"
                variant="secondary"
                className="flex gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 新增詞庫
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
                      title="按兩下可編輯內容"
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
                                {isModifiedDefault ? "已修改" : "內建"}
                              </span>
                            )}
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold text-logo-primary bg-logo-primary/10 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              啟用中
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
                          title="編輯內容"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isCustom ? (
                          <button
                            onClick={() => deleteCustomItem("dict", key)}
                            className="p-1 rounded hover:bg-red-500/10 text-mid-gray hover:text-red-500"
                            title="刪除詞庫"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          isModifiedDefault && (
                            <button
                              onClick={() => resetDefaultItem("dict", key)}
                              className="p-1 rounded hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary"
                              title="還原預設值"
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

        {/* Tab 5: 自訂規則 */}
        {activeTab === 4 && (
          <div className="space-y-3 shadow-sm border border-mid-gray/10 rounded-xl p-4 bg-background-ui/5">
            <h3 className="text-md font-bold">使用者自訂規則</h3>
            <p className="text-xs text-mid-gray">
              在此輸入您個人的排版與修飾偏好指令。例如：「不要使用破折號」、「遇到『的』請盡量換成『地』」。
            </p>
            <Textarea
              value={settings.customRules}
              onChange={(e) => {
                setSettings({ ...settings, customRules: e.target.value });
              }}
              placeholder="請輸入自訂規則..."
              className="w-full h-40 text-sm"
            />
          </div>
        )}

        {/* Tab 6: 備份與還原 */}
        {activeTab === 5 && (
          <div className="space-y-4 shadow-sm border border-mid-gray/10 rounded-xl p-5 bg-background-ui/5">
            <div>
              <h3 className="text-md font-bold text-logo-primary">
                資料備份與搬移
              </h3>
              <p className="text-xs text-mid-gray mt-1">
                一鍵將您的「自訂修飾風格、詞庫、熱詞清單、糾錯規則」打包成壓縮檔
                (ZIP) 匯出備份，或從壓縮檔還原資料。
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleExport} variant="primary" size="md">
                <span>📤 一鍵打包匯出 (ZIP)</span>
              </Button>
              <Button onClick={handleImport} variant="secondary" size="md">
                <span>📥 選擇檔案導入還原 (ZIP)</span>
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
                ? "觀看核心提示詞"
                : editingKey
                  ? `編輯 ${editingType === "main" ? "主 Prompt" : editingType === "mode" ? "修飾模式" : "專業詞庫"}`
                  : editingType === "main"
                    ? "新增主 Prompt"
                    : editingType === "mode"
                      ? "新增修飾模式"
                      : "新增專業詞庫"}
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-mid-gray">
                名稱
              </label>
              <Input
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder={
                  editingType === "main"
                    ? "例如：自訂核心規則"
                    : editingType === "mode"
                      ? "例如：演講模式"
                      : "例如：生化科技"
                }
                className="w-full"
                disabled={isDefaultItem(editingKey)} // 內建/預設項目名稱不可修改
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-mid-gray">
                卡片描述與功能說明 (顯示在 UI 卡片上)
              </label>
              <Input
                value={editorDescription}
                onChange={(e) => setEditorDescription(e.target.value)}
                placeholder="簡短描述此項目功能..."
                className="w-full text-sm"
                disabled={isDefaultItem(editingKey)} // 內建/預設項目描述不可修改
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-mid-gray">
                {editingType === "main"
                  ? "提示詞內容"
                  : editingType === "mode"
                    ? "模式指令與語氣要求 (給 AI 的提示詞)"
                    : "詞彙列表 (給 AI 的對照詞)"}
              </label>
              <Textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="w-full h-48 text-sm leading-relaxed"
                placeholder={
                  editingType === "main"
                    ? "撰寫核心角色設定與基礎指令..."
                    : editingType === "mode"
                      ? "請詳細描述 AI 應該使用的語氣..."
                      : "例如：名詞A, 名詞B, 名詞C..."
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
                  關閉
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setEditorOpen(false)}
                    variant="secondary"
                    size="md"
                  >
                    取消
                  </Button>
                  <Button
                    onClick={saveEditor}
                    variant="primary"
                    size="md"
                    disabled={!editorName.trim() || !editorContent.trim()}
                  >
                    儲存
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
