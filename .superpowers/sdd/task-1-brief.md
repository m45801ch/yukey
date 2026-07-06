# Task 1: Sidebar.tsx + SettingsModal.tsx

**Files to modify:**
1. `src/i18n/locales/en/translation.json` — add 5 keys under `sidebar`
2. `src/i18n/locales/zh-TW/translation.json` — add 5 keys
3. `src/components/Sidebar.tsx` — replace hardcoded labels with `t()`
4. `src/components/SettingsModal.tsx` — replace hardcoded labels with `t()`

## Keys to add to `sidebar`

**en/translation.json:**
```json
"overview": "Overview",
"vocab": "Vocabulary",
"style": "Style",
"settings": "Settings",
"center": "Settings Center"
```

**zh-TW/translation.json:**
```json
"overview": "概覽",
"vocab": "詞彙字典",
"style": "修飾風格",
"settings": "設定",
"center": "設定中心"
```

## Sidebar.tsx changes

The file does NOT currently use `useTranslation`. You need to:
1. Add `import { useTranslation } from "react-i18next";` at the top
2. Add `const { t } = useTranslation();` inside the component
3. Replace:
   - L30: `"概覽"` → `t("sidebar.overview")`
   - L31: `"歷史紀錄"` → `t("sidebar.history")` (key already exists)
   - L32: `"詞彙字典"` → `t("sidebar.vocab")`
   - L33: `"修飾風格"` → `t("sidebar.style")`
   - L77: `設定` → `t("sidebar.settings")`

## SettingsModal.tsx changes

Already uses `useTranslation` (line 31). Replace:
- L38: `"一般設定"` → `t("sidebar.general")`
- L39: `"ASR 模型"` → `t("sidebar.models")`
- L42: `"進階設定"` → `t("sidebar.advanced")`
- L48: `"服務"` → `t("sidebar.postProcessing")`
- L54: `"偵錯資訊"` → `t("sidebar.debug")`
- L61: `"關於 yukey"` → `t("sidebar.about")`
- L77: `設定中心` → `t("sidebar.center")`

## Steps

1. Add keys to `en/translation.json`
2. Add keys to `zh-TW/translation.json`
3. Update `Sidebar.tsx`
4. Update `SettingsModal.tsx`
5. Run `bun x tsc --noEmit` to verify

## Current sidebar section in both files

**en/translation.json** — sidebar currently has:
```json
"sidebar": {
    "general": "General",
    "models": "Models",
    "advanced": "Advanced",
    "postProcessing": "Post Process",
    "history": "History",
    "debug": "Debug",
    "about": "About"
}
```

**zh-TW/translation.json** — sidebar currently has:
```json
"sidebar": {
    "general": "一般",
    "models": "模型",
    "advanced": "進階",
    "postProcessing": "AI 潤色修飾",
    "history": "歷史紀錄",
    "debug": "偵錯",
    "about": "關於"
}
```
