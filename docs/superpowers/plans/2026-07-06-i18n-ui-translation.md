# i18n UI Translation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded Chinese UI strings with i18n `t()` calls across 7 batches.

**Architecture:** Each batch adds keys to `en/translation.json` (source of truth) and `zh-TW/translation.json`, then updates the component file. Other languages fall back to English automatically via i18next.

**Tech Stack:** react-i18next, TypeScript, JSON translation files

## Global Constraints

- Every new key must be added to BOTH `en/translation.json` and `zh-TW/translation.json`
- After each batch, run `bun x tsc --noEmit` to verify type correctness
- Remove `/* eslint-disable i18next/no-literal-string */` from files where all strings are translated
- Toast messages must use `t()` for the message text

---

### Task 1: Sidebar.tsx + SettingsModal.tsx

**Files:**
- Modify: `src/i18n/locales/en/translation.json` — add 5 keys under `sidebar`
- Modify: `src/i18n/locales/zh-TW/translation.json` — add 5 keys
- Modify: `src/components/Sidebar.tsx` — replace hardcoded labels with `t()`
- Modify: `src/components/SettingsModal.tsx` — replace hardcoded labels with `t()`

**Keys to add to `sidebar`:**

en:
```json
"overview": "Overview",
"vocab": "Vocabulary",
"style": "Style",
"settings": "Settings",
"center": "Settings Center"
```

zh-TW:
```json
"overview": "概覽",
"vocab": "詞彙字典",
"style": "修飾風格",
"settings": "設定",
"center": "設定中心"
```

**Sidebar.tsx changes:**
- L30: `"概覽"` → `t("sidebar.overview")`
- L31: `"歷史紀錄"` → `t("sidebar.history")` (key already exists)
- L32: `"詞彙字典"` → `t("sidebar.vocab")`
- L33: `"修飾風格"` → `t("sidebar.style")`
- L77: `設定` → `t("sidebar.settings")`

**SettingsModal.tsx changes:**
- L38: `"一般設定"` → `t("sidebar.general")`
- L39: `"ASR 模型"` → `t("sidebar.models")`
- L42: `"進階設定"` → `t("sidebar.advanced")`
- L48: `"服務"` → `t("sidebar.postProcessing")`
- L54: `"偵錯資訊"` → `t("sidebar.debug")`
- L61: `"關於 yukey"` → `t("sidebar.about")`
- L77: `設定中心` → `t("sidebar.center")`

- [ ] **Step 1:** Add keys to `en/translation.json`
- [ ] **Step 2:** Add keys to `zh-TW/translation.json`
- [ ] **Step 3:** Update `Sidebar.tsx`
- [ ] **Step 4:** Update `SettingsModal.tsx`
- [ ] **Step 5:** Run `bun x tsc --noEmit` to verify

---

### Task 2: App.tsx + AboutSettings.tsx

**Files:**
- Modify: `src/i18n/locales/en/translation.json`
- Modify: `src/i18n/locales/zh-TW/translation.json`
- Modify: `src/App.tsx`
- Modify: `src/components/settings/about/AboutSettings.tsx`

**Keys to add under `pages`:**
- `pages.overview.title` / `pages.history.title` / `pages.vocab.title` / `pages.style.title`

**Keys to add under `settings.about`:**
- `settings.about.sourceCode.description` / `.button`
- `settings.about.acknowledgments.handyTitle` / `.handyDescription` / `.author` / `.license`

**App.tsx changes:**
- L291: `"Loading..."` → `t("common.loading")`
- L348: `"今日概覽"` → `t("pages.overview.title")`
- L349: `"歷史紀錄"` → `t("pages.history.title")`
- L350: `"詞彙字典"` → `t("pages.vocab.title")`
- L351: `"AI 修飾風格"` → `t("pages.style.title")`

**AboutSettings.tsx changes:**
- L46: hardcoded `description` → use `t()` with key
- L54: hardcoded button text → use `t()` with key
- L64-71: hardcoded title/description/spans → use `t()` with keys
- Remove `/* eslint-disable i18next/no-literal-string */` (L1)

- [ ] **Step 1:** Add all keys to `en/translation.json`
- [ ] **Step 2:** Add all keys to `zh-TW/translation.json`
- [ ] **Step 3:** Update `App.tsx`
- [ ] **Step 4:** Update `AboutSettings.tsx`
- [ ] **Step 5:** Run `bun x tsc --noEmit`

---

### Task 3: Overview.tsx

**Files:**
- Modify: `src/i18n/locales/en/translation.json`
- Modify: `src/i18n/locales/zh-TW/translation.json`
- Modify: `src/components/pages/Overview.tsx`

**Keys:** See spec `pages.overview.*` section

**Changes:**
- Remove `/* eslint-disable i18next/no-literal-string */`
- Replace all hardcoded strings with `t()` calls
- Update `formatDuration` to use i18n interpolation (`t("pages.overview.durationMin", { m, s })` etc.)

- [ ] **Step 1:** Add `pages.overview.*` keys to `en/translation.json`
- [ ] **Step 2:** Add keys to `zh-TW/translation.json`
- [ ] **Step 3:** Update `Overview.tsx`
- [ ] **Step 4:** Run `bun x tsc --noEmit`

---

### Task 4: VocabPage.tsx

**Files:**
- Modify: `src/i18n/locales/en/translation.json`
- Modify: `src/i18n/locales/zh-TW/translation.json`
- Modify: `src/components/pages/VocabPage.tsx`

**Keys:** See spec `pages.vocab.*` section

**Changes:**
- Replace all hardcoded labels, placeholders, toasts with `t()` calls
- Update `handleAddWord` / `handleRemoveWord` / `handleAddRule` / `handleRemoveRule` toast messages

- [ ] **Step 1:** Add `pages.vocab.*` keys to `en/translation.json`
- [ ] **Step 2:** Add keys to `zh-TW/translation.json`
- [ ] **Step 3:** Update `VocabPage.tsx`
- [ ] **Step 4:** Run `bun x tsc --noEmit`

---

### Task 5: StylePage.tsx

**Files:**
- Modify: `src/i18n/locales/en/translation.json`
- Modify: `src/i18n/locales/zh-TW/translation.json`
- Modify: `src/components/pages/StylePage.tsx`

**Keys:** See spec `pages.style.*` section (~40 keys)

**Changes:**
- Replace all hardcoded tab labels, section titles, button texts, tooltips, toasts
- Update editor dialog labels and placeholders

- [ ] **Step 1:** Add `pages.style.*` keys to `en/translation.json`
- [ ] **Step 2:** Add keys to `zh-TW/translation.json`
- [ ] **Step 3:** Update `StylePage.tsx`
- [ ] **Step 4:** Run `bun x tsc --noEmit`

---

### Task 6: HistoryPage.tsx

**Files:**
- Modify: `src/i18n/locales/en/translation.json`
- Modify: `src/i18n/locales/zh-TW/translation.json`
- Modify: `src/components/pages/HistoryPage.tsx`

**Keys:** See spec `pages.history.*` section (~30 keys)

**Changes:**
- Replace all hardcoded labels, filters, buttons, toasts, confirmation dialogs

- [ ] **Step 1:** Add `pages.history.*` keys to `en/translation.json`
- [ ] **Step 2:** Add keys to `zh-TW/translation.json`
- [ ] **Step 3:** Update `HistoryPage.tsx`
- [ ] **Step 4:** Run `bun x tsc --noEmit`

---

### Task 7: Remaining files

**Files:**
- Modify: `src/i18n/locales/en/translation.json`
- Modify: `src/i18n/locales/zh-TW/translation.json`
- Modify: `src/components/settings/models/ModelsSettings.tsx`
- Modify: `src/components/settings/TranslateToEnglish.tsx`
- Modify: `src/components/settings/general/GeneralSettings.tsx`
- Modify: `src/components/settings/MicrophoneSelector.tsx`
- Modify: `src/components/settings/OutputDeviceSelector.tsx`
- Modify: `src/components/settings/ClamshellMicrophoneSelector.tsx`
- Modify: `src/stores/settingsStore.ts`

**Keys:**
- `pages.models.*`, `pages.translate.*`, `common.default`, `settings.shortcuts.*`

- [ ] **Step 1:** Add keys to `en/translation.json`
- [ ] **Step 2:** Add keys to `zh-TW/translation.json`
- [ ] **Step 3:** Update all 6 component files
- [ ] **Step 4:** Update `settingsStore.ts`
- [ ] **Step 5:** Run `bun x tsc --noEmit`
