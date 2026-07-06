# Task 3: Overview.tsx

**Files to modify:**
1. `src/i18n/locales/en/translation.json` — add `pages.overview.*` keys
2. `src/i18n/locales/zh-TW/translation.json` — add keys
3. `src/components/pages/Overview.tsx` — replace hardcoded strings

## New keys under `pages.overview`

**en/translation.json:**
```json
"pages": {
  "overview": {
    "title": "Today's Overview",
    "notEnabled": "Not Enabled",
    "noModel": "No model loaded",
    "aiModel": "AI Refinement Model",
    "todayChars": "Today's Characters",
    "todayDuration": "Today's Duration",
    "avgChars": "Avg Chars/Segment",
    "totalCount": "Total Records",
    "weeklyChart": "Last 7 Days Distribution",
    "recentEntries": "Recent Transcriptions",
    "noEntries": "No transcriptions yet",
    "charCount": "{{count}} chars",
    "durationZero": "0 sec",
    "durationMin": "{{m}} min {{s}} sec",
    "durationSec": "{{s}} sec"
  }
}
```

If `pages` already exists (from Task 2), merge `overview` into the existing `pages` object.

**zh-TW/translation.json:**
```json
"pages": {
  "overview": {
    "title": "今日概覽",
    "notEnabled": "未啟用",
    "noModel": "未載入模型",
    "aiModel": "AI 修飾模型",
    "todayChars": "今日字數",
    "todayDuration": "今日時長",
    "avgChars": "平均段落 (字數)",
    "totalCount": "累計紀錄",
    "weeklyChart": "過去 7 天聽寫次數分佈",
    "recentEntries": "最近識別的紀錄",
    "noEntries": "尚無聽寫紀錄",
    "charCount": "{{count}} 字",
    "durationZero": "0 秒",
    "durationMin": "{{m}} 分 {{s}} 秒",
    "durationSec": "{{s}} 秒"
  }
}
```

## Overview.tsx changes

Currently has `/* eslint-disable i18next/no-literal-string */` on line 1 — remove after translation.

Already has `useTranslation` imported and `const { t, i18n } = useTranslation();` on line 26.

Replace:

### Line 45 (postProcessStatus):
```tsx
return { enabled: false, label: "未啟用" };
```
→
```tsx
return { enabled: false, label: t("pages.overview.notEnabled") };
```

### Lines 88-93 (formatDuration function):
```tsx
const formatDuration = (sec: number) => {
  if (sec === 0) return "0 秒";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
};
```
→
```tsx
const formatDuration = (sec: number) => {
  if (sec === 0) return t("pages.overview.durationZero");
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m > 0) return t("pages.overview.durationMin", { m, s });
  return t("pages.overview.durationSec", { s });
};
```

### Line 150:
```tsx
{currentModelInfo?.name || "未載入模型"}
```
→
```tsx
{currentModelInfo?.name || t("pages.overview.noModel")}
```

### Line 164:
```tsx
AI 修飾模型
```
→
```tsx
{t("pages.overview.aiModel")}
```

### Line 178:
```tsx
今日字數
```
→
```tsx
{t("pages.overview.todayChars")}
```

### Line 188:
```tsx
今日時長
```
→
```tsx
{t("pages.overview.todayDuration")}
```

### Line 198:
```tsx
平均段落 (字數)
```
→
```tsx
{t("pages.overview.avgChars")}
```

### Line 208:
```tsx
累計紀錄
```
→
```tsx
{t("pages.overview.totalCount")}
```

### Line 221:
```tsx
過去 7 天聽寫次數分佈
```
→
```tsx
{t("pages.overview.weeklyChart")}
```

### Line 261:
```tsx
最近識別的紀錄
```
→
```tsx
{t("pages.overview.recentEntries")}
```

### Line 265:
```tsx
載入中...
```
→
```tsx
{t("common.loading")}
```

### Line 269:
```tsx
尚無聽寫紀錄
```
→
```tsx
{t("pages.overview.noEntries")}
```

### Line 282:
```tsx
<span>{entry.transcription_text?.length || 0} 字</span>
```
→
```tsx
<span>{t("pages.overview.charCount", { count: entry.transcription_text?.length || 0 })}</span>
```

### Line 1:
Remove `/* eslint-disable i18next/no-literal-string */`

## Steps

1. Add keys to `en/translation.json` (merge into existing `pages` section)
2. Add keys to `zh-TW/translation.json`
3. Update `Overview.tsx`
4. Run `bun x tsc --noEmit`
