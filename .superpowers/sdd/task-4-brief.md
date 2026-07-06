# Task 4: VocabPage.tsx

**Files to modify:**
1. `src/i18n/locales/en/translation.json` — add `pages.vocab.*` keys
2. `src/i18n/locales/zh-TW/translation.json` — add keys
3. `src/components/pages/VocabPage.tsx` — replace hardcoded strings

## New keys under `pages.vocab`

**en/translation.json** — merge into existing `pages` section:
```json
"vocab": {
  "title": "Vocabulary",
  "infoTitle": "Vocabulary & Correction Rules",
  "infoHotwords": "Custom hotwords: suitable for proper nouns, names, product names — helps ASR recognition.",
  "infoRules": "Correction rules: requires a configured AI provider and model in Services, and using a post-processing hotkey during transcription to automatically replace misrecognized words with the correct spelling (e.g. \"face-bookie\" → \"Facebook\").",
  "hotwordsTitle": "Custom Hotwords",
  "hotwordsDescription": "Enter your frequently used terms:",
  "hotwordsPlaceholder": "e.g. Kubernetes",
  "addHotword": "Add Hotword",
  "noHotwords": "No hotwords added yet",
  "rulesTitle": "Correction Rules",
  "rulesDescription": "Replace misrecognized words with correct spelling:",
  "rulePatternPlaceholder": "Wrong word/sound",
  "ruleReplacementPlaceholder": "Correct word",
  "addRule": "Add",
  "noRules": "No correction rules added yet",
  "toastWordExists": "Hotword \"{{word}}\" already exists",
  "toastWordAdded": "Hotword added successfully",
  "toastFieldEmpty": "Fields cannot be empty",
  "toastRuleExists": "Correction rule \"{{pattern}}\" already exists",
  "toastRuleAdded": "Correction rule added",
  "toastRuleRemoved": "Correction rule removed"
}
```

**zh-TW/translation.json:**
```json
"vocab": {
  "title": "詞彙字典",
  "infoTitle": "詞彙與糾錯字典說明",
  "infoHotwords": "自訂熱詞：適合專有名詞、人名、產品名，能幫助 ASR 識別。",
  "infoRules": "糾錯規則：需在「服務」中設定供應商與模型，並使用已設定 AI 潤色的快捷鍵進行轉錄，才會自動將轉錄結果中的錯字或口誤替換成正確詞彙（例如將「飛斯不可」更正為「Facebook」）。",
  "hotwordsTitle": "自訂熱詞",
  "hotwordsDescription": "請輸入您常用的專業熱詞：",
  "hotwordsPlaceholder": "例如：Kubernetes",
  "addHotword": "新增熱詞",
  "noHotwords": "尚無新增的自訂熱詞",
  "rulesTitle": "糾錯對照規則",
  "rulesDescription": "將轉錄錯字替換為正確拼寫：",
  "rulePatternPlaceholder": "原始錯字/音",
  "ruleReplacementPlaceholder": "替換為正確字",
  "addRule": "新增",
  "noRules": "尚無新增的糾錯規則",
  "toastWordExists": "熱詞 \"{{word}}\" 已存在於清單中",
  "toastWordAdded": "熱詞添加成功",
  "toastFieldEmpty": "輸入欄位不可為空",
  "toastRuleExists": "糾錯規則 \"{{pattern}}\" 已存在",
  "toastRuleAdded": "已新增糾錯規則",
  "toastRuleRemoved": "已刪除該糾錯規則"
}
```

## VocabPage.tsx changes

Already has `useTranslation` imported (line 2) and `const { t } = useTranslation();` (line 18).

Replace all hardcoded Chinese strings with `t()` calls:

### Toast messages:
- L59: `` `熱詞 "${sanitizedWord}" 已存在於清單中` `` → `t("pages.vocab.toastWordExists", { word: sanitizedWord })`
- L69: `"熱詞添加成功"` → `t("pages.vocab.toastWordAdded")`
- L85: `"輸入欄位不可為空"` → `t("pages.vocab.toastFieldEmpty")`
- L89: `` `糾錯規則 "${pattern}" 已存在` `` → `t("pages.vocab.toastRuleExists", { pattern })`
- L103: `"已新增糾錯規則"` → `t("pages.vocab.toastRuleAdded")`
- L111: `"已刪除該糾錯規則"` → `t("pages.vocab.toastRuleRemoved")`

### JSX text content:
- L191: `詞彙與糾錯字典說明` → `{t("pages.vocab.infoTitle")}`
- L193: whole `<p>` content (hotwords description) → `{t("pages.vocab.infoHotwords")}`
- L196-198: whole `<p>` content (rules description) → `{t("pages.vocab.infoRules")}`
- L207: `自訂熱詞` → `{t("pages.vocab.hotwordsTitle")}`
- L209: `請輸入您常用的專業熱詞：` → `{t("pages.vocab.hotwordsDescription")}`
- L217: `placeholder="例如：Kubernetes"` → `placeholder={t("pages.vocab.hotwordsPlaceholder")}`
- L231: `新增熱詞` → `{t("pages.vocab.addHotword")}`
- L239: `尚無新增的自訂熱詞` → `{t("pages.vocab.noHotwords")}`
- L263: `糾錯對照規則` → `{t("pages.vocab.rulesTitle")}`
- L266: `將轉錄錯字替換為正確拼寫：` → `{t("pages.vocab.rulesDescription")}`
- L274: `placeholder="原始錯字/音"` → `placeholder={t("pages.vocab.rulePatternPlaceholder")}`
- L283: `placeholder="替換為正確字"` → `placeholder={t("pages.vocab.ruleReplacementPlaceholder")}`
- L293: `新增` → `{t("pages.vocab.addRule")}`
- L301: `尚無新增的糾錯規則` → `{t("pages.vocab.noRules")}`

### NOT to translate:
- Lines 125, 143: `# 語音識別糾錯對照表` and `# 本地熱詞` — these are system prompt content saved to localStorage (data content, not UI), keep as-is.

## Steps

1. Add keys to `en/translation.json` (merge into existing `pages` section)
2. Add keys to `zh-TW/translation.json`
3. Update `VocabPage.tsx`
4. Run `bun x tsc --noEmit`
