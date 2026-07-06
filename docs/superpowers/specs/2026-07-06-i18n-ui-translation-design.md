# i18n UI 翻譯補全設計

## 目標

將前端所有寫死的中文 UI 文字改為 i18n key，支援語言切換。僅處理畫面元件（側邊欄、設定頁籤、頁面標題、按鈕、標籤、Toast、說明文字），不處理 prompt_builder / defaults.ts 的 AI 提示詞資料內容與 utils/backup.ts 備份文字。

## 作法

分 7 批次進行，每批次補 key 到 `en/translation.json` 和 `zh-TW/translation.json`，再修改對應元件。其他語言因缺少 key 會自動 fallback 到英文。

## Key 結構設計

### sidebar — 側邊欄與設定頁籤

```json
{
  "sidebar": {
    "overview": "Overview",
    "vocab": "Vocabulary",
    "style": "Style",
    "settings": "Settings",
    "center": "Settings Center"
  }
}
```

> `sidebar.history` / `.general` / `.models` / `.advanced` / `.postProcessing` / `.debug` / `.about` 已存在。

### pages.overview — 概覽頁

```json
{
  "pages": {
    "overview": {
      "title": "Today's Overview",
      "notEnabled": "Not Enabled",
      "noModel": "No Model Loaded",
      "aiModel": "AI Refinement Model",
      "todayChars": "Today's Characters",
      "todayDuration": "Today's Duration",
      "avgParagraph": "Avg. Paragraph",
      "totalRecords": "Total Records",
      "last7Days": "Last 7 Days",
      "recentRecords": "Recent Records",
      "noRecords": "No Records Yet",
      "chars": "{{count}} chars",
      "durationZero": "0s",
      "durationMin": "{{m}}m {{s}}s",
      "durationSec": "{{s}}s"
    }
  }
}
```

### pages.history — 歷史頁

```json
{
  "pages": {
    "history": {
      "title": "History",
      "listTitle": "Transcription List",
      "audioFolder": "Audio Folder",
      "filterAll": "All Records",
      "filterWithAudio": "With Audio",
      "filterSaved": "Favorites",
      "detailTitle": "Record Details",
      "detailTime": "Detailed Time",
      "searchPlaceholder": "Search keywords...",
      "playAudio": "Play Audio",
      "downloadAudio": "Download Audio",
      "selectPrompt": "Select an item from the list to view details",
      "textCount": "Text: {{current}} / {{total}} records",
      "audioCount": "Audio: {{current}} / {{total}} files",
      "clearAll": "Clear All Records",
      "clearSaved": "Clear All Favorites",
      "copyText": "Copy Text",
      "copyRaw": "Copy Raw Transcription",
      "copyPolished": "Copy AI Polished Text",
      "rawLabel": "Raw Transcription",
      "polishedLabel": "AI Polished Text",
      "clickToCopy": "Click to select and copy",
      "copied": "Selected and copied",
      "deleted": "Record deleted successfully",
      "clearConfirm": "Are you sure you want to clear all transcription history and audio files? Favorited items will be kept.",
      "clearSavedConfirm": "Are you sure you want to clear all favorited transcriptions and audio files?",
      "cleared": "All records and audio files cleared successfully (favorites kept)",
      "downloadSuccess": "Audio file downloaded successfully!",
      "empty": "No transcription history yet",
      "emptySaved": "No favorited transcriptions yet"
    }
  }
}
```

### pages.vocab — 詞彙字典頁

```json
{
  "pages": {
    "vocab": {
      "title": "Vocabulary",
      "sectionTitle": "Vocabulary & Correction Dictionary",
      "hotwordDesc": "Custom hotwords: suitable for proper nouns, names, product names to help ASR recognition.",
      "correctionDesc": "Correction rules: requires a configured provider and model in Services, and using the AI refinement shortcut key to automatically replace misrecognized words.",
      "hotwordTitle": "Custom Hotwords",
      "hotwordPrompt": "Enter your commonly used professional terms:",
      "hotwordPlaceholder": "e.g. Kubernetes",
      "addHotword": "Add Hotword",
      "noHotwords": "No custom hotwords added yet",
      "correctionTitle": "Correction Rules",
      "correctionPrompt": "Replace misrecognized text with correct spelling:",
      "correctionPatternPH": "Original text",
      "correctionReplacePH": "Correct text",
      "addRule": "Add",
      "noRules": "No correction rules added yet",
      "wordExists": "Hotword \"{{word}}\" already exists",
      "wordAdded": "Hotword added successfully",
      "emptyFields": "Fields cannot be empty",
      "ruleExists": "Correction rule \"{{pattern}}\" already exists",
      "ruleAdded": "Correction rule added",
      "ruleRemoved": "Correction rule removed"
    }
  }
}
```

### pages.style — 修飾風格頁

```json
{
  "pages": {
    "style": {
      "title": "AI Refinement Style",
      "description": "Modular configuration to precisely control AI speech-to-text refinement behavior and vocabulary. All changes are automatically saved and take effect immediately.",
      "tab": {
        "mainPrompt": "Main Prompt",
        "modes": "Refinement Modes",
        "hotwords": "Hotwords",
        "dicts": "Specialized Dictionaries",
        "customRules": "Custom Rules",
        "backup": "Backup & Restore"
      },
      "mainPromptTitle": "Core System Prompt",
      "mainPromptHint": "Click a card to switch; double-click to view or edit.",
      "modeTitle": "Context Refinement Modes",
      "modeHint": "Click a card to switch; double-click to edit.",
      "hotwordTitle": "Hotword Management",
      "hotwordDesc": "Enter English nouns, company names, people names, etc. that you frequently use. Hotwords help the ASR model recognize them more accurately.",
      "hotwordPlaceholder": "e.g. Kubernetes (no spaces)",
      "dictTitle": "Specialized Dictionaries",
      "dictHint": "Click a card to enable; double-click to edit dictionary contents.",
      "customRulesTitle": "User Custom Rules",
      "customRulesPlaceholder": "Enter your custom formatting and refinement preferences...",
      "backupTitle": "Data Backup & Migration",
      "backupDesc": "One-click to package your custom refinement styles, dictionaries, hotwords, and correction rules into a ZIP file.",
      "addMainPrompt": "Add Main Prompt",
      "addMode": "Add Mode",
      "addDict": "Add Dictionary",
      "addHotword": "Add Hotword",
      "save": "Save",
      "cancel": "Cancel",
      "close": "Close",
      "delete": "Delete",
      "restoreDefault": "Restore Defaults",
      "viewPrompt": "View Core Prompt",
      "editTitle": "Edit",
      "exportZip": "Export ZIP",
      "importZip": "Import ZIP",
      "status": {
        "inUse": "In Use",
        "default": "Default",
        "custom": "Custom",
        "modified": "Modified",
        "readonly": "Read-only",
        "builtin": "Built-in",
        "enabled": "Enabled"
      },
      "dialog": {
        "editTitle": "Edit",
        "name": "Name",
        "namePH": "e.g. Custom Core Rules",
        "modeNamePH": "e.g. Presentation Mode",
        "dictNamePH": "e.g. Biotechnology",
        "description": "Card Description",
        "descriptionPH": "Briefly describe this item...",
        "content": "Prompt Content",
        "contentHint": "Mode instructions and tone requirements",
        "dictContentHint": "Vocabulary list",
        "contentPlaceholderMain": "Write core persona and basic instructions...",
        "contentPlaceholderMode": "Describe the tone and style the AI should use...",
        "contentPlaceholderDict": "e.g. TermA, TermB, TermC..."
      },
      "toast": {
        "saved": "Changes applied automatically!",
        "deleted": "Item deleted and reapplied!",
        "restored": "Default settings restored and applied!",
        "hotwordExists": "Hotword already exists",
        "hotwordAdded": "Hotword added and applied",
        "hotwordRemoved": "Hotword removed and reapplied"
      }
    }
  }
}
```

### pages.models — 模型設定頁

```json
{
  "pages": {
    "models": {
      "sortLabel": "Sort: {{label}}",
      "sort": {
        "name": "Model Name",
        "accuracy": "Accuracy",
        "speed": "Speed",
        "size": "File Size"
      }
    }
  }
}
```

### pages.translate — 翻譯目標語言

```json
{
  "pages": {
    "translate": {
      "targetEn": "English",
      "targetZh": "Traditional Chinese",
      "targetZhCn": "Simplified Chinese",
      "targetJa": "Japanese",
      "targetKo": "Korean",
      "targetEs": "Spanish",
      "targetFr": "French",
      "targetDe": "German"
    }
  }
}
```

### settings.about — 關於頁補充

```json
{
  "settings": {
    "about": {
      "sourceCode": {
        "description": "View the open-source code and development progress of yukey.",
        "button": "View on GitHub"
      },
      "acknowledgments": {
        "handyTitle": "Acknowledgements (Handy)",
        "handyDescription": "yukey is a derivative of CJ Pais's excellent open-source project Handy, with deep customization. We sincerely thank the original author for their open-source spirit and outstanding technical architecture contributions to local speech-to-text applications.",
        "author": "Original Author: CJ Pais",
        "license": "License: MIT License"
      }
    }
  }
}
```

### common — 通用

```json
{
  "common": {
    "default": "Default",
    "copied": "Copied to clipboard",
    "loading": "Loading..."
  }
}
```

### settings.shortcuts — 快捷鍵衝突 (settingsStore.ts)

```json
{
  "settings": {
    "shortcuts": {
      "other": "Other",
      "conflictMessage": "This shortcut conflicts with \"{{name}}\". Override and clear \"{{name}}\"?",
      "conflictTitle": "Shortcut Conflict"
    }
  }
}
```

## 實作批次

| 批 | 檔案 | Key 數 |
|----|------|--------|
| 1 | Sidebar.tsx + SettingsModal.tsx | +4 sidebars + 1 center |
| 2 | App.tsx + AboutSettings.tsx | +10 |
| 3 | Overview.tsx | +15 |
| 4 | VocabPage.tsx | +20 |
| 5 | StylePage.tsx | +40 |
| 6 | HistoryPage.tsx | +30 |
| 7 | ModelsSettings, TranslateToEnglish, GeneralSettings, selectors, settingsStore | +15 |

每批獨立完成：補 en/zh-TW key → 改元件 → `tsc --noEmit` 驗證。
