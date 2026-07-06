# Task 5: StylePage.tsx

**Files to modify:**
1. `src/i18n/locales/en/translation.json` — add `pages.style.*` keys
2. `src/i18n/locales/zh-TW/translation.json` — add keys
3. `src/components/pages/StylePage.tsx` — replace hardcoded strings

## All keys under `pages.style`

**en/translation.json** — merge into existing `pages` section:
```json
"style": {
  "title": "AI Style",
  "description": "Modular settings to precisely control AI speech-to-text refinement behavior and vocabulary. All changes save and apply automatically.",
  "tabs": {
    "mainPrompt": "Main Prompt",
    "modes": "Refinement Modes",
    "hotwords": "Hotwords",
    "dicts": "Domain Dict",
    "customRules": "Custom Rules",
    "backup": "Backup & Restore"
  },
  "mainPrompt": {
    "title": "Core System Prompt",
    "hint": "Tip: Click a card to apply; double-click to view or edit.",
    "addButton": "New Main Prompt",
    "defaultBadge": "Default (Read-only)",
    "customBadge": "Custom",
    "inUse": "In Use",
    "viewTooltip": "Double-click to view",
    "editTooltip": "Double-click to edit",
    "viewAction": "View",
    "editAction": "Edit",
    "deleteAction": "Delete"
  },
  "modes": {
    "title": "Context Refinement Modes",
    "hint": "Tip: Click a card to switch; double-click to edit.",
    "addButton": "New Mode",
    "editTooltip": "Double-click to edit",
    "modifiedBadge": "Modified",
    "builtinBadge": "Built-in",
    "inUse": "In Use",
    "editAction": "Edit",
    "deleteAction": "Delete Mode",
    "resetAction": "Reset to Default"
  },
  "hotwords": {
    "title": "Hotword Management",
    "description": "Enter frequently used English terms, company names, people names, etc. Changes sync to both the ASR engine (Whisper) and AI refinement prompts.",
    "placeholder": "e.g. Kubernetes (no spaces)",
    "addButton": "Add Hotword",
    "noHotwords": "No custom hotwords yet. Add them here or in the Vocabulary page."
  },
  "dicts": {
    "title": "Domain Dictionaries",
    "hint": "Tip: Click cards to toggle; double-click to edit content.",
    "addButton": "New Dictionary",
    "editTooltip": "Double-click to edit",
    "modifiedBadge": "Modified",
    "builtinBadge": "Built-in",
    "enabled": "Enabled",
    "editAction": "Edit",
    "deleteAction": "Delete Dictionary",
    "resetAction": "Reset to Default"
  },
  "customRules": {
    "title": "Custom Rules",
    "description": "Enter your personal formatting and refinement preferences. For example: \"Avoid using dashes\", \"Replace informal terms with formal equivalents\".",
    "placeholder": "Enter custom rules..."
  },
  "backup": {
    "title": "Data Backup & Migration",
    "description": "One-click export of your custom styles, dictionaries, hotwords, and correction rules as a ZIP file, or restore from a backup.",
    "exportButton": "Export as ZIP",
    "importButton": "Import from ZIP"
  },
  "editor": {
    "viewTitle": "View Core Prompt",
    "editTitleMain": "Edit Main Prompt",
    "editTitleMode": "Edit Refinement Mode",
    "editTitleDict": "Edit Domain Dictionary",
    "newTitleMain": "New Main Prompt",
    "newTitleMode": "New Refinement Mode",
    "newTitleDict": "New Domain Dictionary",
    "nameLabel": "Name",
    "namePlaceholderMain": "e.g. Custom Core Rules",
    "namePlaceholderMode": "e.g. Speech Mode",
    "namePlaceholderDict": "e.g. Biotechnology",
    "descLabel": "Card Description (shown on UI card)",
    "descPlaceholder": "Brief description of this item...",
    "contentLabelMain": "Prompt Content",
    "contentLabelMode": "Mode Instructions & Tone (AI prompt)",
    "contentLabelDict": "Vocabulary List (AI reference)",
    "contentPlaceholderMain": "Write core role settings and base instructions...",
    "contentPlaceholderMode": "Describe the tone the AI should use...",
    "contentPlaceholderDict": "e.g. NounA, NounB, NounC...",
    "closeButton": "Close",
    "cancelButton": "Cancel",
    "saveButton": "Save"
  },
  "toast": {
    "rulesAutoSaved": "Custom rules saved and applied!",
    "changesApplied": "Changes applied!",
    "confirmDelete": "Are you sure you want to delete this item?",
    "itemDeleted": "Item deleted and reapplied!",
    "confirmReset": "Are you sure you want to reset this default item to factory settings?",
    "resetDone": "Default settings restored and applied!",
    "wordExists": "Hotword \"{{word}}\" already exists",
    "wordAdded": "Hotword added and applied",
    "wordRemoved": "Hotword removed and reapplied"
  },
  "descFallback": "Description for {{name}}."
}
```

**zh-TW/translation.json:**
```json
"style": {
  "title": "AI 修飾風格",
  "description": "透過模組化的設定，精確控制 AI 語音轉文字的修飾行為與詞彙。所有變更均會自動儲存並即時生效。",
  "tabs": {
    "mainPrompt": "主 Prompt",
    "modes": "修飾模式",
    "hotwords": "Hotwords",
    "dicts": "專業詞庫",
    "customRules": "自訂規則",
    "backup": "備份與還原"
  },
  "mainPrompt": {
    "title": "核心系統提示詞",
    "hint": "提示：點擊卡片直接切換套用；按兩下卡片可觀看或編輯提示詞。",
    "addButton": "新增主 Prompt",
    "defaultBadge": "預設唯讀",
    "customBadge": "自訂",
    "inUse": "使用中",
    "viewTooltip": "按兩下可觀看完整內容",
    "editTooltip": "按兩下可編輯內容",
    "viewAction": "觀看內容",
    "editAction": "編輯內容",
    "deleteAction": "刪除"
  },
  "modes": {
    "title": "情境修飾模式",
    "hint": "提示：點擊卡片直接切換套用；按兩下卡片可編輯內容",
    "addButton": "新增模式",
    "editTooltip": "按兩下可編輯內容",
    "modifiedBadge": "已修改",
    "builtinBadge": "內建",
    "inUse": "使用中",
    "editAction": "編輯內容",
    "deleteAction": "刪除模式",
    "resetAction": "還原預設值"
  },
  "hotwords": {
    "title": "專屬熱詞管理",
    "description": "輸入您常用的英文名詞、公司名稱、人名等。在此處變更將同步至「語音識別引擎（Whisper）」與「AI 潤色提示詞」。",
    "placeholder": "例如：Kubernetes (不含空格)",
    "addButton": "新增熱詞",
    "noHotwords": "尚無新增的自訂熱詞，您可在此處或「詞彙字典」頁面中加入。"
  },
  "dicts": {
    "title": "專業領域詞庫",
    "hint": "提示：點擊卡片直接勾選啟用；按兩下卡片可編輯詞彙內容",
    "addButton": "新增詞庫",
    "editTooltip": "按兩下可編輯內容",
    "modifiedBadge": "已修改",
    "builtinBadge": "內建",
    "enabled": "啟用中",
    "editAction": "編輯內容",
    "deleteAction": "刪除詞庫",
    "resetAction": "還原預設值"
  },
  "customRules": {
    "title": "使用者自訂規則",
    "description": "在此輸入您個人的排版與修飾偏好指令。例如：「不要使用破折號」、「遇到『的』請盡量換成『地』」。",
    "placeholder": "請輸入自訂規則..."
  },
  "backup": {
    "title": "資料備份與搬移",
    "description": "一鍵將您的「自訂修飾風格、詞庫、熱詞清單、糾錯規則」打包成壓縮檔 (ZIP) 匯出備份，或從壓縮檔還原資料。",
    "exportButton": "📤 一鍵打包匯出 (ZIP)",
    "importButton": "📥 選擇檔案導入還原 (ZIP)"
  },
  "editor": {
    "viewTitle": "觀看核心提示詞",
    "editTitleMain": "編輯主 Prompt",
    "editTitleMode": "編輯修飾模式",
    "editTitleDict": "編輯專業詞庫",
    "newTitleMain": "新增主 Prompt",
    "newTitleMode": "新增修飾模式",
    "newTitleDict": "新增專業詞庫",
    "nameLabel": "名稱",
    "namePlaceholderMain": "例如：自訂核心規則",
    "namePlaceholderMode": "例如：演講模式",
    "namePlaceholderDict": "例如：生化科技",
    "descLabel": "卡片描述與功能說明 (顯示在 UI 卡片上)",
    "descPlaceholder": "簡短描述此項目功能...",
    "contentLabelMain": "提示詞內容",
    "contentLabelMode": "模式指令與語氣要求 (給 AI 的提示詞)",
    "contentLabelDict": "詞彙列表 (給 AI 的對照詞)",
    "contentPlaceholderMain": "撰寫核心角色設定與基礎指令...",
    "contentPlaceholderMode": "請詳細描述 AI 應該使用的語氣...",
    "contentPlaceholderDict": "例如：名詞A, 名詞B, 名詞C...",
    "closeButton": "關閉",
    "cancelButton": "取消",
    "saveButton": "儲存"
  },
  "toast": {
    "rulesAutoSaved": "自訂規則已自動儲存套用！",
    "changesApplied": "變更已自動套用！",
    "confirmDelete": "確定要刪除此項目嗎？",
    "itemDeleted": "項目已刪除並重新套用！",
    "confirmReset": "確定要將此預設項目恢復為原始出廠設定嗎？",
    "resetDone": "已還原預設設定並自動套用！",
    "wordExists": "熱詞 \"{{word}}\" 已存在於清單中",
    "wordAdded": "熱詞添加並套用成功",
    "wordRemoved": "熱詞已移除並重新套用"
  },
  "descFallback": "{{name}}說明。"
}
```

## StylePage.tsx changes

Already has `const { t } = useTranslation();` (line 23).

Replace ALL hardcoded strings. Key replacements:

### Tabs (L45-52):
Replace array with objects using `t()` for `name`.

### Tab 0 section:
- L293-295 description → `t("pages.style.description")`
- L322 title → `t("pages.style.mainPrompt.title")`
- L323-325 hint → `t("pages.style.mainPrompt.hint")`
- L333 button → `t("pages.style.mainPrompt.addButton")`
- L353 tooltip: conditional `isDefault ? "按兩下可觀看完整內容" : "按兩下可編輯內容"` → `t(isDefault ? "pages.style.mainPrompt.viewTooltip" : "pages.style.mainPrompt.editTooltip")`
- L368: `isDefault ? "預設唯讀" : "自訂"` → `t(isDefault ? "pages.style.mainPrompt.defaultBadge" : "pages.style.mainPrompt.customBadge")`
- L373: `"使用中"` → `t("pages.style.mainPrompt.inUse")`
- L389 title: `isDefault ? "觀看內容" : "編輯內容"` → `t(isDefault ? "pages.style.mainPrompt.viewAction" : "pages.style.mainPrompt.editAction")`
- L397 title: `"刪除"` → `t("pages.style.mainPrompt.deleteAction")`

### Tab 1 section:
- L416 title → `t("pages.style.modes.title")`
- L417-419 hint → `t("pages.style.modes.hint")`
- L427 button → `t("pages.style.modes.addButton")`
- L445 title: `"按兩下可編輯內容"` → `t("pages.style.modes.editTooltip")`
- L460: `isModifiedDefault ? "已修改" : "內建"` → `t(isModifiedDefault ? "pages.style.modes.modifiedBadge" : "pages.style.modes.builtinBadge")`
- L466: `"使用中"` → `t("pages.style.modes.inUse")`
- L482 title: `"編輯內容"` → `t("pages.style.modes.editAction")`
- L490 title: `"刪除模式"` → `t("pages.style.modes.deleteAction")`
- L499 title: `"還原預設值"` → `t("pages.style.modes.resetAction")`

### Tab 2 section:
- L518-519 title → `t("pages.style.hotwords.title")`
- L521-524 description → `t("pages.style.hotwords.description")`
- L533 placeholder → `t("pages.style.hotwords.placeholder")`
- L547 button → `t("pages.style.hotwords.addButton")`
- L555: `"尚無新增的自訂熱詞..."` → `t("pages.style.hotwords.noHotwords")`

### Tab 3 section:
- L581 title → `t("pages.style.dicts.title")`
- L583-584 hint → `t("pages.style.dicts.hint")`
- L592 button → `t("pages.style.dicts.addButton")`
- L616 title → `t("pages.style.dicts.editTooltip")`
- L638: `isModifiedDefault ? "已修改" : "內建"` → `t(isModifiedDefault ? "pages.style.dicts.modifiedBadge" : "pages.style.dicts.builtinBadge")`
- L644: `"啟用中"` → `t("pages.style.dicts.enabled")`
- L660 title → `t("pages.style.dicts.editAction")`
- L668 title → `t("pages.style.dicts.deleteAction")`
- L677 title → `t("pages.style.dicts.resetAction")`

### Tab 4 section:
- L695 title → `t("pages.style.customRules.title")`
- L696-698 description → `t("pages.style.customRules.description")`
- L704 placeholder → `t("pages.style.customRules.placeholder")`

### Tab 5 section:
- L714-715 title → `t("pages.style.backup.title")`
- L717-720 description → `t("pages.style.backup.description")`
- L724 button text → `t("pages.style.backup.exportButton")`
- L727 button text → `t("pages.style.backup.importButton")`

### Editor Modal (L735-836):
- L739-747: Conditional title → use appropriate key:
  - `editingKey === "default"` → `t("pages.style.editor.viewTitle")`
  - `editingKey && type === "main"` → `t("pages.style.editor.editTitleMain")`
  - `editingKey && type === "mode"` → `t("pages.style.editor.editTitleMode")`
  - `editingKey && type === "dict"` → `t("pages.style.editor.editTitleDict")`
  - `!editingKey && type === "main"` → `t("pages.style.editor.newTitleMain")`
  - `!editingKey && type === "mode"` → `t("pages.style.editor.newTitleMode")`
  - `!editingKey && type === "dict"` → `t("pages.style.editor.newTitleDict")`

### Toast messages:
- L102 → `t("pages.style.toast.rulesAutoSaved")`
- L173 → `t("pages.style.toast.changesApplied")`
- L180 → `t("pages.style.toast.confirmDelete")`
- L203 → `t("pages.style.toast.itemDeleted")`
- L210 → `t("pages.style.toast.confirmReset")`
- L223 → `t("pages.style.toast.resetDone")`
- L236 → `t("pages.style.toast.wordExists", { word: sanitizedWord })`
- L243 → `t("pages.style.toast.wordAdded")`
- L252 → `t("pages.style.toast.wordRemoved")`

### Other:
- L150: `` `${editorName.trim()}說明。` `` → use template literal with `t("pages.style.descFallback", { name: editorName.trim() })`
- L752 label → `t("pages.style.editor.nameLabel")`
- L758-762 placeholder → use conditional `t()` as appropriate
- L771 label → `t("pages.style.editor.descLabel")`
- L776 placeholder → `t("pages.style.editor.descPlaceholder")`
- L784-788 label → conditional `t()` as appropriate
- L794-799 placeholder → conditional `t()` as appropriate
- L808 button → `t("pages.style.editor.closeButton")`
- L816 button → `t("pages.style.editor.cancelButton")`
- L829 button → `t("pages.style.editor.saveButton")`

## Steps

1. Add all keys to `en/translation.json` (merge into existing `pages`)
2. Add keys to `zh-TW/translation.json`
3. Update `StylePage.tsx`
4. Run `bun x tsc --noEmit`
