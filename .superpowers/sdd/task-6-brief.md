# Task 6: HistoryPage.tsx

**Files to modify:**
1. `src/i18n/locales/en/translation.json` — add `pages.history.*` keys
2. `src/i18n/locales/zh-TW/translation.json` — add keys
3. `src/components/pages/HistoryPage.tsx` — replace hardcoded strings

Also update `settings.history.copied` in both translation files (missing key).

## New/Updated keys

### `settings.history.copied` (add to existing `settings.history`)

**en:** `"copied": "Copied to clipboard"`
**zh-TW:** `"copied": "已複製到剪貼簿"`

### `pages.history.*` (new section, merge into existing `pages`)

**en/translation.json:**
```json
"history": {
  "title": "History",
  "entryList": "Entries",
  "openFolder": "Recordings Folder",
  "filterAll": "All",
  "filterAudio": "With Audio",
  "filterSaved": "Saved",
  "loading": "Loading...",
  "emptyAll": "No history entries yet",
  "emptySaved": "No saved entries yet",
  "detailTitle": "Details",
  "statsText": "Text: {{count}} / {{limit}} entries",
  "statsAudio": "Audio: {{count}} / {{limit}} files",
  "statsTextTooltip": "Text history entries count and limit (click to filter all)",
  "statsAudioTooltip": "Audio files count and limit (click to filter entries with audio)",
  "clearAll": "Clear All",
  "clearSaved": "Clear Saved",
  "clearAllTooltip": "Clear all history entries and audio files",
  "clearSavedTooltip": "Clear all saved entries and audio files",
  "searchPlaceholder": "Search history entries...",
  "timestamp": "Timestamp",
  "copyTooltipDefault": "Copy (default: raw text)",
  "copyTooltipRaw": "Copy selected raw text",
  "copyTooltipPolished": "Copy selected polished text",
  "copyTooltip": "Copy text",
  "toggleSave": "Save",
  "toggleUnsave": "Unsave",
  "delete": "Delete",
  "rawText": "Raw Text (Raw ASR)",
  "polishedText": "Polished Text (Polished)",
  "clickToSelect": "Click to select & copy",
  "selectedAndCopied": "Selected & copied",
  "audioPlayback": "Audio Playback",
  "downloadAudio": "Download Audio",
  "noSelection": "Select an entry from the list to view details",
  "toastDeleteSuccess": "Entry deleted successfully",
  "toastClearConfirm": "Are you sure you want to clear all history entries and audio files? (Saved items will be preserved. This action cannot be undone.)",
  "toastClearTitle": "Clear All History",
  "toastClearError": "Failed to clear history: {{error}}",
  "toastClearSuccess": "Successfully cleared history entries and audio files (saved items preserved)",
  "toastClearGenericError": "Error clearing history",
  "toastClearSavedConfirm": "Are you sure you want to clear all saved history entries and audio files? (This will permanently delete them and cannot be undone.)",
  "toastClearSavedTitle": "Clear All Saved",
  "toastClearSavedError": "Failed to clear saved entries: {{error}}",
  "toastClearSavedSuccess": "Successfully cleared all saved entries and audio files",
  "toastClearSavedGenericError": "Error clearing saved entries",
  "toastDownloadSuccess": "Audio file downloaded!",
  "toastDownloadError": "Failed to download audio: {{error}}",
  "toastDownloadGenericError": "Error downloading audio file"
}
```

**zh-TW/translation.json:**
```json
"history": {
  "title": "歷史紀錄",
  "entryList": "聽寫列表",
  "openFolder": "錄音資料夾",
  "filterAll": "全部紀錄",
  "filterAudio": "有語音檔",
  "filterSaved": "收藏項目",
  "loading": "載入中...",
  "emptyAll": "尚無歷史聽寫紀錄",
  "emptySaved": "尚無已收藏的聽寫紀錄",
  "detailTitle": "紀錄詳情",
  "statsText": "文字：{{count}} / {{limit}} 筆",
  "statsAudio": "語音：{{count}} / {{limit}} 檔",
  "statsTextTooltip": "文字歷史紀錄筆數與上限（點擊篩選全部文字紀錄）",
  "statsAudioTooltip": "已保留錄音檔筆數與上限（點擊篩選含有錄音檔的紀錄）",
  "clearAll": "清空所有紀錄",
  "clearSaved": "清空所有收藏",
  "clearAllTooltip": "清空所有歷史紀錄與錄音檔",
  "clearSavedTooltip": "清空所有已收藏紀錄與錄音檔",
  "searchPlaceholder": "搜尋歷史紀錄中的關鍵字...",
  "timestamp": "詳細時間",
  "copyTooltipDefault": "複製文字 (預設為原始轉錄)",
  "copyTooltipRaw": "複製選取的原始轉錄文字",
  "copyTooltipPolished": "複製選取的 AI 潤色文字",
  "copyTooltip": "複製文字",
  "toggleSave": "加入收藏",
  "toggleUnsave": "取消收藏",
  "delete": "刪除",
  "rawText": "原始轉錄文字 (Raw ASR)",
  "polishedText": "AI 潤色修飾文字 (Polished Text)",
  "clickToSelect": "點擊選取並複製",
  "selectedAndCopied": "已選取並複製",
  "audioPlayback": "語音播放",
  "downloadAudio": "下載錄音檔",
  "noSelection": "選擇左側清單中的項目以查看詳情",
  "toastDeleteSuccess": "已成功刪除該筆聽寫紀錄",
  "toastClearConfirm": "確定要清空所有的歷史聽寫紀錄以及錄音檔嗎？（已收藏的項目將會被保留，此動作無法復原。）",
  "toastClearTitle": "清空所有紀錄",
  "toastClearError": "清空歷史紀錄失敗：{{error}}",
  "toastClearSuccess": "已成功清空聽寫紀錄及錄音檔（已保留收藏項目）",
  "toastClearGenericError": "清空歷史紀錄發生錯誤",
  "toastClearSavedConfirm": "確定要清空所有的已收藏聽寫紀錄以及錄音檔嗎？（此動作將永久刪除且無法復原。）",
  "toastClearSavedTitle": "清空所有收藏",
  "toastClearSavedError": "清空收藏紀錄失敗：{{error}}",
  "toastClearSavedSuccess": "已成功清空所有已收藏的紀錄及錄音檔",
  "toastClearSavedGenericError": "清空收藏紀錄發生錯誤",
  "toastDownloadSuccess": "錄音檔下載成功！",
  "toastDownloadError": "下載錄音檔失敗：{{error}}",
  "toastDownloadGenericError": "下載錄音檔發生錯誤"
}
```

## HistoryPage.tsx changes

Already has `const { t, i18n } = useTranslation();` (line 38).

### Filter buttons (L395, 405, 415):
- `"全部紀錄"` → `{t("pages.history.filterAll")}`
- `"有語音檔"` → `{t("pages.history.filterAudio")}`
- `"收藏項目"` → `{t("pages.history.filterSaved")}`

### Loading/empty (L423, 427):
- `"載入中..."` → `{t("pages.history.loading")}`
- `filter === "saved" ? "..." : "..."` → `{t(filter === "saved" ? "pages.history.emptySaved" : "pages.history.emptyAll")}`

### Left column header (L372, 381):
- `"聽寫列表"` → `{t("pages.history.entryList")}`
- `"錄音資料夾"` → `{t("pages.history.openFolder")}`

### Right column header (L469, 480-482, 491-493, 506-508, 512):
- `"紀錄詳情"` → `{t("pages.history.detailTitle")}`
- title tooltip L480 → `t("pages.history.statsTextTooltip")`
- L482 template `` `文字：${stats.text_count} / ${stats.text_limit} 筆` `` → `t("pages.history.statsText", { count: stats.text_count, limit: stats.text_limit })`
- L491 title → `t("pages.history.statsAudioTooltip")`
- L493 template → `t("pages.history.statsAudio", { count: stats.audio_count, limit: stats.audio_limit })`
- L506-508 title → `t(filter === "saved" ? "pages.history.clearSavedTooltip" : "pages.history.clearAllTooltip")`
- L512 text → `t(filter === "saved" ? "pages.history.clearSaved" : "pages.history.clearAll")`

### Search (L522):
- placeholder → `t("pages.history.searchPlaceholder")`

### Detail section (L537, 556-563, 575, 585, 606, 614, 642, 649, 665, 674, 686):
- L537 "詳細時間" → `t("pages.history.timestamp")`
- L556-563 title (complex ternary) — simplify using t():
  ```
  title={selectedEntry.post_processed_text
    ? currentCopyTarget === "polished"
      ? "複製選取的 AI 潤色文字"
      : currentCopyTarget === "raw"
        ? "複製選取的原始轉錄文字"
        : "複製文字 (預設為原始轉錄)"
    : "複製文字"
  }
  ```
  → Use:
  ```
  title={selectedEntry.post_processed_text
    ? currentCopyTarget === "polished"
      ? t("pages.history.copyTooltipPolished")
      : currentCopyTarget === "raw"
        ? t("pages.history.copyTooltipRaw")
        : t("pages.history.copyTooltipDefault")
    : t("pages.history.copyTooltip")
  }
  ```
- L575: `selectedEntry.saved ? "取消收藏" : "加入收藏"` → `t(selectedEntry.saved ? "pages.history.toggleUnsave" : "pages.history.toggleSave")`
- L585: `"刪除"` → `t("pages.history.delete")`
- L606: `"原始轉錄文字 (Raw ASR)"` → `t("pages.history.rawText")`
- L614: `currentCopyTarget === "raw" ? "已選取並複製" : "點擊選取並複製"` → `t(currentCopyTarget === "raw" ? "pages.history.selectedAndCopied" : "pages.history.clickToSelect")`
- L642: `"AI 潤色修飾文字 (Polished Text)"` → `t("pages.history.polishedText")`
- L649: same as L614 but for polished → same pattern
- L665: `"語音播放"` → `t("pages.history.audioPlayback")`
- L674: `"下載錄音檔"` → `t("pages.history.downloadAudio")`
- L686: `"選擇左側清單中的項目以查看詳情"` → `t("pages.history.noSelection")`

### Toast messages:
- L215: `t("settings.history.copied") || "已複製到剪貼簿"` → change to just `t("settings.history.copied")` (key now exists)
- L252: `"已成功刪除該筆聽寫紀錄"` → `t("pages.history.toastDeleteSuccess")`
- L263: `"確定要清空所有的歷史聽寫紀錄..."` → `t("pages.history.toastClearConfirm")`
- L265: `title: "清空所有紀錄"` → `title: t("pages.history.toastClearTitle")`
- L275: `` "清空歷史紀錄失敗：" + String(result.error) `` → `` t("pages.history.toastClearError", { error: String(result.error) }) ``
- L285: `"已成功清空..."` → `t("pages.history.toastClearSuccess")`
- L290: `"清空歷史紀錄發生錯誤"` → `t("pages.history.toastClearGenericError")`
- L296: `"確定要清空所有的已收藏..."` → `t("pages.history.toastClearSavedConfirm")`
- L298: `title: "清空所有收藏"` → `title: t("pages.history.toastClearSavedTitle")`
- L308: `` "清空收藏紀錄失敗：" + String(result.error) `` → `` t("pages.history.toastClearSavedError", { error: String(result.error) }) ``
- L318: `"已成功清空所有已收藏..."` → `t("pages.history.toastClearSavedSuccess")`
- L323: `"清空收藏紀錄發生錯誤"` → `t("pages.history.toastClearSavedGenericError")`
- L354: `"錄音檔下載成功！"` → `t("pages.history.toastDownloadSuccess")`
- L356: `` "下載錄音檔失敗：" + String(result.error) `` → `` t("pages.history.toastDownloadError", { error: String(result.error) }) ``
- L361: `"下載錄音檔發生錯誤"` → `t("pages.history.toastDownloadGenericError")`

### ask() dialog title/message:
- L262-266 uses `ask()` from `@tauri-apps/plugin-dialog` — the message and title should use `t()`

## Steps

1. Add `settings.history.copied` + `pages.history.*` keys to `en/translation.json`
2. Add keys to `zh-TW/translation.json`
3. Update `HistoryPage.tsx` — replace all hardcoded strings
4. Run `bun x tsc --noEmit`
