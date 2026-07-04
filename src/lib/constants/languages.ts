export interface Language {
  value: string;
  label: string;
}

export const CHINESE_LANGUAGE_CODE = "zh";

export const LANGUAGES: Language[] = [
  { value: "auto", label: "Auto Detect" },
  { value: "en", label: "English" },
  { value: CHINESE_LANGUAGE_CODE, label: "Chinese" },
  { value: "zh-Hans", label: "Chinese (Simplified)" },
  { value: "zh-Hant", label: "Chinese (Traditional)" },
  { value: "yue", label: "Cantonese" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "ru", label: "Russian" },
  { value: "ko", label: "Korean" },
  { value: "fr", label: "French" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
  { value: "tr", label: "Turkish" },
  { value: "pl", label: "Polish" },
  { value: "ca", label: "Catalan" },
  { value: "nl", label: "Dutch" },
  { value: "ar", label: "Arabic" },
  { value: "sv", label: "Swedish" },
  { value: "it", label: "Italian" },
  { value: "id", label: "Indonesian" },
  { value: "hi", label: "Hindi" },
  { value: "fi", label: "Finnish" },
  { value: "vi", label: "Vietnamese" },
  { value: "he", label: "Hebrew" },
  { value: "uk", label: "Ukrainian" },
  { value: "el", label: "Greek" },
  { value: "ms", label: "Malay" },
  { value: "cs", label: "Czech" },
  { value: "ro", label: "Romanian" },
  { value: "da", label: "Danish" },
  { value: "hu", label: "Hungarian" },
  { value: "ta", label: "Tamil" },
  { value: "no", label: "Norwegian" },
  { value: "th", label: "Thai" },
  { value: "ur", label: "Urdu" },
  { value: "hr", label: "Croatian" },
  { value: "bg", label: "Bulgarian" },
  { value: "lt", label: "Lithuanian" },
  { value: "la", label: "Latin" },
  { value: "mi", label: "Maori" },
  { value: "ml", label: "Malayalam" },
  { value: "cy", label: "Welsh" },
  { value: "sk", label: "Slovak" },
  { value: "te", label: "Telugu" },
  { value: "fa", label: "Persian" },
  { value: "lv", label: "Latvian" },
  { value: "bn", label: "Bengali" },
  { value: "sr", label: "Serbian" },
  { value: "az", label: "Azerbaijani" },
  { value: "sl", label: "Slovenian" },
  { value: "kn", label: "Kannada" },
  { value: "et", label: "Estonian" },
  { value: "mk", label: "Macedonian" },
  { value: "br", label: "Breton" },
  { value: "eu", label: "Basque" },
  { value: "is", label: "Icelandic" },
  { value: "hy", label: "Armenian" },
  { value: "ne", label: "Nepali" },
  { value: "mn", label: "Mongolian" },
  { value: "bs", label: "Bosnian" },
  { value: "kk", label: "Kazakh" },
  { value: "sq", label: "Albanian" },
  { value: "sw", label: "Swahili" },
  { value: "gl", label: "Galician" },
  { value: "mr", label: "Marathi" },
  { value: "pa", label: "Punjabi" },
  { value: "si", label: "Sinhala" },
  { value: "km", label: "Khmer" },
  { value: "sn", label: "Shona" },
  { value: "yo", label: "Yoruba" },
  { value: "so", label: "Somali" },
  { value: "af", label: "Afrikaans" },
  { value: "oc", label: "Occitan" },
  { value: "ka", label: "Georgian" },
  { value: "be", label: "Belarusian" },
  { value: "tg", label: "Tajik" },
  { value: "sd", label: "Sindhi" },
  { value: "gu", label: "Gujarati" },
  { value: "am", label: "Amharic" },
  { value: "yi", label: "Yiddish" },
  { value: "lo", label: "Lao" },
  { value: "uz", label: "Uzbek" },
  { value: "fo", label: "Faroese" },
  { value: "ht", label: "Haitian Creole" },
  { value: "ps", label: "Pashto" },
  { value: "tk", label: "Turkmen" },
  { value: "nn", label: "Nynorsk" },
  { value: "mt", label: "Maltese" },
  { value: "sa", label: "Sanskrit" },
  { value: "lb", label: "Luxembourgish" },
  { value: "my", label: "Myanmar" },
  { value: "bo", label: "Tibetan" },
  { value: "tl", label: "Tagalog" },
  { value: "mg", label: "Malagasy" },
  { value: "as", label: "Assamese" },
  { value: "tt", label: "Tatar" },
  { value: "haw", label: "Hawaiian" },
  { value: "ln", label: "Lingala" },
  { value: "ha", label: "Hausa" },
  { value: "ba", label: "Bashkir" },
  { value: "jw", label: "Javanese" },
  { value: "su", label: "Sundanese" },
];

const CHINESE_OUTPUT_INTENTS = new Set(["zh-Hans", "zh-Hant"]);

const LANGUAGE_LABELS = new Map(
  LANGUAGES.map((language) => [language.value, language.label] as const),
);

export const MODEL_CAPABILITY_LANGUAGES: Language[] = LANGUAGES.filter(
  (language) =>
    language.value !== "auto" && !CHINESE_OUTPUT_INTENTS.has(language.value),
);

// Languages offered in the transcription-language picker. We surface the two
// explicit Chinese *output* variants (Simplified / Traditional) and hide the
// bare recognition code `zh` ("Chinese"): all three recognize identically, so
// the plain option only adds ambiguity about which script you get. `zh` stays in
// LANGUAGES — it's still a valid *effective* language (auto-detect and must-pick
// fallback can resolve to it) and its label is needed to render that state — it
// just isn't directly selectable.
export const SELECTABLE_LANGUAGES: Language[] = LANGUAGES.filter(
  (language) => language.value !== CHINESE_LANGUAGE_CODE,
);

// Collapse a language tag to the base code Handy matches on, dropping any
// BCP-47 region or script subtag: "en-US" → "en", "zh-CN" → "zh", "zh-Hant" →
// "zh". Bare and three-letter codes ("haw") pass through unchanged. This lets
// the picker match a model's *real* codes — which may be full locales like
// "en-US" (e.g. Nemotron Streaming) — against Handy's canonical bare-code
// LANGUAGES list without the backend having to mangle the codes the engine needs.
export const recognitionLanguage = (languageCode: string): string => {
  const separatorIndex = languageCode.indexOf("-");
  return separatorIndex === -1
    ? languageCode
    : languageCode.slice(0, separatorIndex);
};

export const supportsLanguageCode = (
  supportedLanguages: string[],
  languageCode: string,
): boolean => {
  const recognitionCode = recognitionLanguage(languageCode);
  return supportedLanguages.some(
    (supportedLanguage) =>
      recognitionLanguage(supportedLanguage) === recognitionCode,
  );
};

export const getUniqueCapabilityLanguages = (
  supportedLanguages: string[],
): string[] => {
  const seen = new Set<string>();
  return supportedLanguages.map(recognitionLanguage).filter((languageCode) => {
    if (seen.has(languageCode)) return false;
    seen.add(languageCode);
    return true;
  });
};

const CHINESE_TRANSLATIONS: Record<string, string> = {
  en: "英文",
  zh: "中文",
  "zh-Hans": "簡體中文",
  "zh-Hant": "繁體中文",
  yue: "粵語",
  de: "德文",
  es: "西班牙文",
  ru: "俄文",
  ko: "韓文",
  fr: "法文",
  ja: "日文",
  pt: "葡萄牙文",
  tr: "土耳其文",
  pl: "波蘭文",
  ca: "加泰隆尼亞文",
  nl: "荷蘭文",
  ar: "阿拉伯文",
  sv: "瑞典文",
  it: "義大利文",
  id: "印尼文",
  hi: "印地文",
  fi: "芬蘭文",
  vi: "越南文",
  he: "希伯來文",
  uk: "烏克蘭文",
  el: "希臘文",
  ms: "馬來文",
  cs: "捷克文",
  ro: "羅馬尼亞文",
  da: "丹麥文",
  hu: "匈牙利文",
  ta: "泰米爾文",
  no: "挪威文",
  th: "泰文",
  ur: "烏爾都文",
  hr: "克羅埃西亞文",
  bg: "保加利亞文",
  lt: "立陶宛文",
  la: "拉丁文",
  mi: "毛利文",
  ml: "馬拉雅拉姆文",
  cy: "威爾斯文",
  sk: "斯洛伐克文",
  te: "泰盧固文",
  fa: "波斯文",
  lv: "拉脫維亞文",
  bn: "孟加拉文",
  sr: "塞爾維亞文",
  az: "亞塞拜然文",
  sl: "斯洛維尼亞文",
  kn: "卡納達文",
  et: "愛沙尼亞文",
  mk: "馬其頓文",
  br: "布列塔尼文",
  eu: "巴斯克文",
  is: "冰島文",
  hy: "亞美尼亞文",
  ne: "尼泊爾文",
  mn: "蒙古文",
  bs: "波士尼亞文",
  kk: "哈薩克文",
  sq: "阿爾巴尼亞文",
  sw: "斯瓦希里文",
  gl: "加利西亞文",
  mr: "馬拉地文",
  pa: "旁遮普文",
  si: "僧伽羅文",
  km: "高棉文",
  sn: "修納文",
  yo: "約魯巴文",
  so: "索馬利文",
  af: "南非荷蘭文",
  oc: "奧克文",
  ka: "喬治亞文",
  be: "白俄羅斯文",
  tg: "塔吉克文",
  sd: "信德文",
  gu: "古吉拉特文",
  am: "阿姆哈拉文",
  yi: "意第緒文",
  lo: "寮國文",
  uz: "烏茲別克文",
  fo: "法羅文",
  ht: "海地克里奧爾文",
  ps: "普什圖文",
  tk: "土庫曼文",
  nn: "新挪威文",
  mt: "馬爾他文",
  sa: "梵文",
  lb: "盧森堡文",
  my: "緬甸文",
  bo: "藏文",
  tl: "他加祿文",
  mg: "馬達加斯加文",
  as: "阿薩姆文",
  tt: "韃靼文",
  haw: "夏威夷文",
  ln: "林加拉文",
  ha: "豪薩文",
  ba: "巴什基爾文",
  jw: "爪哇文",
  su: "巽他文",
};

export const getLanguageLabel = (
  languageCode: string,
  currentLang?: string,
): string | undefined => {
  const baseLabel = LANGUAGE_LABELS.get(languageCode);
  if (!baseLabel) return undefined;

  if (currentLang && currentLang.startsWith("zh")) {
    if (languageCode === "auto") {
      return "自動檢測";
    }
    const chineseName = CHINESE_TRANSLATIONS[languageCode];
    if (chineseName) {
      return `${baseLabel} (${chineseName})`;
    }
  }

  return baseLabel;
};
