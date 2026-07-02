import { DEFAULT_MAIN_PROMPT, DEFAULT_MODES, DEFAULT_DICTIONARIES } from "./defaults";

export interface PromptPluginSettings {
  activeMainPrompt: string;
  customMainPrompts: Record<string, { name: string; description: string; content: string }>;
  activeMode: string;
  activeDictionaries: string[];
  customRules: string;
  customModes: Record<string, { name: string; description: string; content: string }>;
  customDictionaries: Record<string, { name: string; description: string; content: string }>;
}

const STORAGE_KEY = "openless_prompt_plugin_settings";

export const getDefaultSettings = (): PromptPluginSettings => ({
  activeMainPrompt: "default",
  customMainPrompts: {},
  activeMode: "general",
  activeDictionaries: [],
  customRules: "",
  customModes: {},
  customDictionaries: {},
});

export const loadPromptSettings = (): PromptPluginSettings => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...getDefaultSettings(), ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load prompt plugin settings", e);
  }
  return getDefaultSettings();
};

export const savePromptSettings = (settings: PromptPluginSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};

export const getAvailableMainPrompts = (
  settings: PromptPluginSettings
): Record<string, { name: string; description: string; content: string }> => {
  return {
    default: {
      name: "OpenLess 核心提示詞",
      description: "系統預設的核心身份定義與規則，確保語音修飾的極致準確性與原意保留。",
      content: DEFAULT_MAIN_PROMPT,
    },
    ...settings.customMainPrompts,
  };
};

export const getAvailableModes = (settings: PromptPluginSettings) => {
  return { ...DEFAULT_MODES, ...settings.customModes };
};

export const getAvailableDictionaries = (settings: PromptPluginSettings) => {
  return { ...DEFAULT_DICTIONARIES, ...settings.customDictionaries };
};

/**
 * 根據設定動態組裝最終的 Prompt
 */
export const buildPrompt = (settings: PromptPluginSettings, customWords: string[] = []): string => {
  const parts: string[] = [];

  // 1. 主 Prompt
  const mainPrompts = getAvailableMainPrompts(settings);
  const activeMain = mainPrompts[settings.activeMainPrompt] || mainPrompts["default"];
  parts.push(activeMain.content);

  // 2. 修飾模式
  const modes = getAvailableModes(settings);
  const activeModeData = modes[settings.activeMode] || modes["general"];
  parts.push(`---

# 當前修飾模式：${activeModeData.name}

${activeModeData.content}`);

  // 3. Hotwords (整合自系統全域設定 custom_words)
  if (customWords.length > 0) {
    parts.push(`---

# 本地熱詞 (Hotwords)

若語音中出現以下發音相近的詞彙，請優先替換為下列專有名詞：
- ${customWords.join(", ")}`);
  }

  // 4. 專業詞庫
  const dicts = getAvailableDictionaries(settings);
  const activeDicts = settings.activeDictionaries
    .map((key) => dicts[key])
    .filter(Boolean);

  if (activeDicts.length > 0) {
    parts.push(`---

# 啟用的專業詞庫

若語音內容涉及以下領域，請優先使用該領域的專業術語：`);
    activeDicts.forEach((dict) => {
      parts.push(`- **${dict.name}**：${dict.content}`);
    });
  }

  // 5. 自訂規則
  if (settings.customRules.trim()) {
    parts.push(`---

# 使用者自訂規則

${settings.customRules.trim()}`);
  }

  // 6. 語音辨識糾錯對照表 (VocabPage 建立的後綴)
  const correctionsSuffix = localStorage.getItem("yukey_prompt_corrections_suffix") || "";
  if (correctionsSuffix) {
    parts.push(correctionsSuffix.trim());
  }

  // 7. 轉錄結果佔位符
  parts.push(`---

最終僅輸出整理完成後的文字，不得加入任何前言、標題、說明、Markdown 或程式碼區塊。

Transcript:
\${output}`);

  return parts.join("\n\n");
};
