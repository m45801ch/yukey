# Task 7: Remaining files

**Files to modify:**
1. `src/i18n/locales/en/translation.json`
2. `src/i18n/locales/zh-TW/translation.json`
3. `src/components/settings/models/ModelsSettings.tsx`
4. `src/components/settings/TranslateToEnglish.tsx`
5. `src/components/settings/general/GeneralSettings.tsx`
6. `src/components/settings/MicrophoneSelector.tsx`
7. `src/components/settings/OutputDeviceSelector.tsx`
8. `src/components/settings/ClamshellMicrophoneSelector.tsx`
9. `src/stores/settingsStore.ts`

## New/Updated keys

### `common.default` (add to existing `common` section)

**en:** `"default": "Default"`
**zh-TW:** `"default": "預設"`

### `settings.overlay_and_theme.title` (new key)

**en:** `"title": "Overlay & Theme"`
**zh-TW:** `"title": "懸浮窗與主題"`

### `pages.models.*` (new section, merge into existing `pages`)

**en/translation.json:**
```json
"models": {
  "sortName": "Sort by Name",
  "sortAccuracy": "Sort by Accuracy",
  "sortSpeed": "Sort by Speed",
  "sortSize": "Sort by Size",
  "sortPrefix": "Sort: "
}
```

**zh-TW/translation.json:**
```json
"models": {
  "sortName": "模型名稱",
  "sortAccuracy": "模型精準度",
  "sortSpeed": "辨識速度",
  "sortSize": "檔案大小",
  "sortPrefix": "排序："
}
```

### `pages.translate.languages.*` (new section under `pages.translate`)

**en/translation.json:**
```json
"translate": {
  "languages": {
    "en": "English",
    "zh-TW": "Traditional Chinese",
    "zh-CN": "Simplified Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "es": "Spanish",
    "fr": "French",
    "de": "German"
  }
}
```

**zh-TW/translation.json:**
```json
"translate": {
  "languages": {
    "en": "English (英文)",
    "zh-TW": "Traditional Chinese (繁體中文)",
    "zh-CN": "Simplified Chinese (簡體中文)",
    "ja": "Japanese (日文)",
    "ko": "Korean (韓文)",
    "es": "Spanish (西班牙文)",
    "fr": "French (法文)",
    "de": "German (德文)"
  }
}
```

### `pages.settings.conflictFallback` (new key)

**en:** `"conflictFallback": "other function"`
**zh-TW:** `"conflictFallback": "其他功能"`

### `pages.settings.conflictMessage`

**en:** `"conflictMessage": "This shortcut conflicts with \"{{name}}\". Overwrite and clear \"{{name}}\"?"`
**zh-TW:** `"conflictMessage": "此快捷鍵與「{{name}}」衝突。是否要覆蓋並清除「{{name}}」的快捷鍵？"`

## Component changes

### ModelsSettings.tsx

Already has `const { t } = useTranslation();` (line 31).

**L45-58 (getSortLabel function):**
Replace the whole function body with t() calls:
```tsx
const getSortLabel = (type: string) => {
  switch (type) {
    case "name": return t("pages.models.sortName");
    case "accuracy": return t("pages.models.sortAccuracy");
    case "speed": return t("pages.models.sortSpeed");
    case "size": return t("pages.models.sortSize");
    default: return "";
  }
};
```

**L334:** `排序：{getSortLabel(sortBy)}` → `{t("pages.models.sortPrefix")}{getSortLabel(sortBy)}`

**L346-349:** Replace hardcoded labels in sort options array:
```tsx
{ value: "name", label: t("pages.models.sortName") },
{ value: "accuracy", label: t("pages.models.sortAccuracy") },
{ value: "speed", label: t("pages.models.sortSpeed") },
{ value: "size", label: t("pages.models.sortSize") },
```

### TranslateToEnglish.tsx

Already has `const { t } = useTranslation();` (line 20).

**L27-36 (languageOptions array):** Replace hardcoded labels:
```tsx
const languageOptions = [
  { value: "en", label: t("pages.translate.languages.en") },
  { value: "zh-TW", label: t("pages.translate.languages.zh-TW") },
  { value: "zh-CN", label: t("pages.translate.languages.zh-CN") },
  { value: "ja", label: t("pages.translate.languages.ja") },
  { value: "ko", label: t("pages.translate.languages.ko") },
  { value: "es", label: t("pages.translate.languages.es") },
  { value: "fr", label: t("pages.translate.languages.fr") },
  { value: "de", label: t("pages.translate.languages.de") },
];
```

**L45:** `t("settings.advanced.translateUsingLlm.localSupportedDesc", "預設使用本地模型將語音翻譯為英文，開啟以切換為雲端服務大模型進行多國語言翻譯。")` — the second argument is the fallback. Remove the fallback since key already exists: `t("settings.advanced.translateUsingLlm.localSupportedDesc")`. Check that this key exists in both files first (it does from the original translation work).

### GeneralSettings.tsx

Already has `const { t } = useTranslation();` (line 19).

**L57:** `t("settings.overlay_and_theme.title", "懸浮窗與主題")` — remove fallback, use just `t("settings.overlay_and_theme.title")`

### MicrophoneSelector.tsx

Already has `const { t } = useTranslation();` (line 15).

**L42:** `t("common.default", "預設")` — remove fallback, use just `t("common.default")`

### OutputDeviceSelector.tsx

Already has `const { t } = useTranslation();` (line 18).

**L45:** `t("common.default", "預設")` — remove fallback, use just `t("common.default")`

### ClamshellMicrophoneSelector.tsx

Already has `const { t } = useTranslation();` (line 16).

**L68:** `t("common.default", "預設")` — remove fallback, use just `t("common.default")`

### settingsStore.ts

Does NOT use i18n. Need to add `import i18n from "../i18n";` (or find the right import path).

Actually, settingsStore.ts is in `src/stores/`. The i18n config is at `src/i18n/index.ts`. The import should be:
```tsx
import i18n from "../i18n";
```

Then:
**L369:** `result.data.conflict_name || result.data.conflict_id || "其他功能"` → change to `result.data.conflict_name || result.data.conflict_id || i18n.t("pages.settings.conflictFallback")`

**L371:** `` `此快捷鍵與「${conflictName}」衝突。是否要覆蓋並清除「${conflictName}」的快捷鍵？` `` → `i18n.t("pages.settings.conflictMessage", { name: conflictName })`

Note: `window.confirm()` works with any string, so using i18n.t() here is fine.

## Steps

1. Add all keys to `en/translation.json` (common.default, settings.overlay_and_theme.title, pages.models.*, pages.translate.languages.*, pages.settings.*)
2. Add keys to `zh-TW/translation.json`
3. Update all 7 component/store files
4. Run `bun x tsc --noEmit`
