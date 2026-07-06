# Task 2: App.tsx + AboutSettings.tsx

**Files to modify:**
1. `src/i18n/locales/en/translation.json`
2. `src/i18n/locales/zh-TW/translation.json`
3. `src/App.tsx`
4. `src/components/settings/about/AboutSettings.tsx`

## New Keys

### `pages.*` section (new top-level section)

Add a new `pages` section to both files:

**en/translation.json:**
```json
"pages": {
  "overview": {
    "title": "Today's Overview"
  },
  "history": {
    "title": "History"
  },
  "vocab": {
    "title": "Vocabulary"
  },
  "style": {
    "title": "AI Style"
  }
}
```

**zh-TW/translation.json:**
```json
"pages": {
  "overview": {
    "title": "今日概覽"
  },
  "history": {
    "title": "歷史紀錄"
  },
  "vocab": {
    "title": "詞彙字典"
  },
  "style": {
    "title": "AI 修飾風格"
  }
}
```

### `settings.about.sourceCode` updates

Update `description` in both files to match the AboutSettings component:

**en/translation.json** — change from `"View source code and contribute"` to:
```json
"description": "View yukey's open source code and development progress."
```

**zh-TW/translation.json** — change from `"檢視原始碼並參與貢獻"` to:
```json
"description": "檢視 yukey 專案的開源原始碼與開發進度。"
```

Keep `button` as-is (already exists).

### `settings.about.acknowledgments.*` new keys

**en/translation.json** — add after `settings.about.acknowledgments.ggml.details`:
```json
"handyTitle": "Acknowledgments to Original Project (Handy)",
"handyDescription": "This project yukey is derived from CJ Pais's excellent open-source project Handy with deep customization and modifications. We are grateful for the original author's open-source spirit and outstanding technical architecture contributions to local speech-to-text applications.",
"author": "Original Author: CJ Pais",
"license": "License: MIT License"
```

**zh-TW/translation.json** — add after `settings.about.acknowledgments.ggml.details`:
```json
"handyTitle": "致謝原創專案 (Handy)",
"handyDescription": "本專案 yukey 係基於原作者 CJ Pais 的優秀開源專案 Handy 進行衍生與深度客製修改。我們由衷感謝原作者的開源精神與對本機語音轉文字應用的卓越技術架構貢獻。",
"author": "原始專案作者：CJ Pais",
"license": "授權條款：MIT License"
```

## App.tsx changes

Currently has no `useTranslation` import. You need to:
1. Add `import { useTranslation } from "react-i18next";` at top
2. Add `const { t } = useTranslation();` somewhere in the component
3. Replace:
   - L291: `"Loading..."` → `t("common.loading")` (key already exists)
   - L348: `"今日概覽"` → `t("pages.overview.title")`
   - L349: `"歷史紀錄"` → `t("pages.history.title")`
   - L350: `"詞彙字典"` → `t("pages.vocab.title")`
   - L351: `"AI 修飾風格"` → `t("pages.style.title")`

## AboutSettings.tsx changes

Already uses `useTranslation` (line 3). Has `/* eslint-disable i18next/no-literal-string */` on line 1 — remove this after translation.

Replace:
- L46: hardcoded description `"檢視 yukey 專案..."` → `t("settings.about.sourceCode.description")`
- L54: hardcoded button text `"GitHub 原始碼"` → `t("settings.about.sourceCode.button")`
- L64: hardcoded title `"致謝原創專案 (Handy)"` → `t("settings.about.acknowledgments.handyTitle")`
- L65: hardcoded description → `t("settings.about.acknowledgments.handyDescription")`
- L70: `"• 原始專案作者：CJ Pais"` → `t("settings.about.acknowledgments.author")`
- L71: `"• 授權條款：MIT License"` → `t("settings.about.acknowledgments.license")`
- L72-74: `"Copyright (c) 2025 CJ Pais"` — keep as-is (static copyright, no translation needed)

After all strings are translated, remove line 1: `/* eslint-disable i18next/no-literal-string */`

## Steps

1. Add/update keys in `en/translation.json`
2. Add/update keys in `zh-TW/translation.json`
3. Update `App.tsx`
4. Update `AboutSettings.tsx`
5. Run `bun x tsc --noEmit`
