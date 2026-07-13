import {
  DEFAULT_MAIN_PROMPT,
  DEFAULT_MODES,
  DEFAULT_DICTIONARIES,
} from "./defaults";

export interface PromptPluginSettings {
  activeMainPrompt: string;
  customMainPrompts: Record<
    string,
    { name: string; description: string; content: string }
  >;
  activeMode: string;
  activeDictionaries: string[];
  customRules: string;
  customModes: Record<
    string,
    { name: string; description: string; content: string }
  >;
  customDictionaries: Record<
    string,
    { name: string; description: string; content: string }
  >;
  dictionaryCustomEntries: Record<string, Array<{ term: string; explanation: string }>>;
}

export interface StyleMetadata {
  name: string;
  priority: number;
  allowed_overrides: string[];
  forbidden_overrides: string[];
}

export interface DictMetadata {
  name: string;
  priority: number;
  allowed_overrides: string[];
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
  dictionaryCustomEntries: {},
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
  settings: PromptPluginSettings,
): Record<string, { name: string; description: string; content: string }> => {
  return {
    default: {
      name: "OpenLess 核心提示詞",
      description:
        "系統預設的核心身份定義與規則，確保語音修飾的極致準確性與原意保留。",
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

function parseYamlValue(value: string): any {
  const trimmed = value.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""));
  }
  if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
  return trimmed.replace(/^["']|["']$/g, "");
}

function parseFrontMatter(
  content: string,
): { metadata: Record<string, any> | null; body: string } {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { metadata: null, body: content };
  }
  const end = trimmed.indexOf("---", 3);
  if (end === -1) return { metadata: null, body: content };
  const yamlBlock = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 3).trim();
  const metadata: Record<string, any> = {};
  for (const line of yamlBlock.split("\n")) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      metadata[match[1]] = parseYamlValue(match[2]);
    }
  }
  return { metadata: Object.keys(metadata).length > 0 ? metadata : null, body };
}

function extractStyleMetadata(
  content: string,
): { metadata: StyleMetadata; body: string } {
  const { metadata, body } = parseFrontMatter(content);
  if (metadata && metadata.name) {
    return {
      metadata: {
        name: metadata.name || "未知",
        priority: metadata.priority ?? 5,
        allowed_overrides: metadata.allowed_overrides || [],
        forbidden_overrides: metadata.forbidden_overrides || [],
      },
      body,
    };
  }
  return {
    metadata: {
      name: "未知",
      priority: 5,
      allowed_overrides: ["tone", "formality", "structure"],
      forbidden_overrides: ["preserve_meaning", "anti_hallucination", "no_answering"],
    },
    body: content,
  };
}

export function extractDictMetadata(
  content: string,
): { metadata: DictMetadata; body: string } {
  const { metadata, body } = parseFrontMatter(content);
  if (metadata && metadata.name) {
    return {
      metadata: {
        name: metadata.name || "未知",
        priority: metadata.priority ?? 3,
        allowed_overrides: metadata.allowed_overrides || [],
      },
      body,
    };
  }
  return {
    metadata: { name: "未知", priority: 3, allowed_overrides: ["terminology"] },
    body: content,
  };
}

interface ValidationWarning {
  type: "override_violation";
  source: string;
  target: string;
  field: string;
  message: string;
}

function validateOverrides(
  blocks: {
    type: string;
    name: string;
    priority: number;
    forbidden_overrides: string[];
    fields: string[];
  }[],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const sorted = [...blocks].sort((a, b) => a.priority - b.priority);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const lower = sorted[i];
      const higher = sorted[j];
      for (const field of lower.fields) {
        if (higher.forbidden_overrides.includes(field)) {
          warnings.push({
            type: "override_violation",
            source: `${lower.type}:"${lower.name}"`,
            target: `${higher.type}:"${higher.name}"`,
            field,
            message: `${lower.name} (priority ${lower.priority}) 嘗試覆蓋 ${higher.name} (priority ${higher.priority}) 禁止修改的欄位 "${field}"，已忽略此覆蓋`,
          });
        }
      }
    }
  }
  return warnings;
}

/**
 * 根據設定動態組裝最終的 Prompt
 */
export const buildPrompt = (
  settings: PromptPluginSettings,
  customWords: string[] = [],
): string => {
  const parts: string[] = [];
  const blocks: {
    type: string;
    name: string;
    priority: number;
    forbidden_overrides: string[];
    fields: string[];
  }[] = [];

  // 1. 主 Prompt (always first)
  const mainPrompts = getAvailableMainPrompts(settings);
  const activeMain =
    mainPrompts[settings.activeMainPrompt] || mainPrompts["default"];
  parts.push(activeMain.content);

  // 2. Style Prompt - parse front matter
  const modes = getAvailableModes(settings);
  const activeModeData = modes[settings.activeMode] || modes["general"];
  const style = extractStyleMetadata(activeModeData.content);
  blocks.push({
    type: "style",
    name: style.metadata.name,
    priority: style.metadata.priority,
    forbidden_overrides: style.metadata.forbidden_overrides,
    fields: style.metadata.allowed_overrides,
  });
  parts.push(`---

# 當前修飾模式：${style.metadata.name}

${style.body}`);

  // 3. Hotwords
  if (customWords.length > 0) {
    parts.push(`---

# 本地熱詞 (Hotwords)

若語音中出現以下發音相近的詞彙，請優先替換為下列專有名詞：
- ${customWords.join(", ")}`);
  }

  // 4. 專業詞庫 - parse front matter from each dictionary
  const dicts = getAvailableDictionaries(settings);
  const activeDicts = settings.activeDictionaries
    .map((key) => dicts[key])
    .filter(Boolean);

  if (activeDicts.length > 0) {
    const dictParts: string[] = [];
    for (const dict of activeDicts) {
      const parsed = extractDictMetadata(dict.content);
      blocks.push({
        type: "dictionary",
        name: parsed.metadata.name,
        priority: parsed.metadata.priority,
        forbidden_overrides: [],
        fields: parsed.metadata.allowed_overrides,
      });
      dictParts.push(`- **${parsed.metadata.name}**：${parsed.body}`);
    }
    parts.push(`---

# 啟用的專業詞庫

若語音內容涉及以下領域，請優先使用該領域的專業術語：
${dictParts.join("\n")}`);
  }

  // Validate override conflicts
  const warnings = validateOverrides(blocks);
  for (const w of warnings) {
    console.warn(`[OpenLess Framework] ${w.message}`);
  }

  // 5. 自訂規則
  if (settings.customRules.trim()) {
    parts.push(`---

# 使用者自訂規則

${settings.customRules.trim()}`);
  }

  // 6. 語音辨識糾錯對照表 (VocabPage 建立的後綴)
  const correctionsSuffix =
    localStorage.getItem("yukey_prompt_corrections_suffix") || "";
  if (correctionsSuffix) {
    parts.push(correctionsSuffix.trim());
  }

  // 7. 轉錄結果佔位符
  parts.push(`---

最終僅輸出整理完成後的文字，不得加入任何前言、標題、說明、Markdown 或程式碼區塊。

Transcript:
${"${output}"}`);

  return parts.join("\n\n");
};
