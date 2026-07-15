import type { TFunction } from "i18next";
import i18n from "i18next";
import type { ModelInfo } from "@/bindings";

/**
 * Get the translated name for a model
 * @param model - The model info object
 * @param t - The translation function from useTranslation
 * @returns The translated model name, or the original name if no translation exists
 */
export function getTranslatedModelName(model: ModelInfo, t: TFunction): string {
  const translationKey = `onboarding.models.${model.id}.name`;
  const translated = t(translationKey, { defaultValue: "" });
  return translated !== "" ? translated : model.name;
}

const DESCRIPTION_TRANSLATIONS_ZH_CN: Record<string, string> = {
  "Fast, accurate live English transcription": "快速且准确的实时英语转录",
  "Live multilingual transcription across 28 languages": "支持 28 种语言的实时多语言转录",
  "Tiny and instant, runs well on any hardware": "极小且即时，在任何硬件上都能良好运行",
  "Highest accuracy, 14 languages, slower": "准确度最高，支持 14 种语言，速度较慢",
  "Broadest language, but may run a bit slow": "支持语言最广，但运行可能稍慢",
  "Live multilingual, excellent on powerful machines": "实时多语言转录，在高效能机器上表现优异",
  "Fast and accurate. Supports 25 European languages": "快速且准确。支持 25 种欧洲语言",
  "English only. The best model for English speakers": "仅限英语。英语用户的最佳模型",
  "Excellent multilingual model": "优秀的多语言模型",
  "A tiny multilingual model": "极小的多语言模型",
  "4-language speech-to-text with translation.": "支持 4 种语言的语音转文字与翻译。",
  "25-language speech-to-text with translation.": "支持 25 种语言的语音转文字与翻译。",
  "English speech-to-text.": "英语语音转文字。",
  "3-language speech-to-text.": "支持 3 种语言的语音转文字。",
  "English speech-to-text with token-level timestamps.": "支持词级时间戳的英语语音转文字。",
  "5-language speech-to-text.": "支持 5 种语言的语音转文字。",
  "6-language speech-to-text with translation.": "支持 6 种语言的语音转文字与翻译。",
  "5-language speech-to-text with word-level timestamps.": "支持单词级时间戳的 5 种语言语音转文字。",
  "English speech-to-text with streaming.": "支持流式输出的英语语音转文字。",
  "English speech-to-text with streaming, token-level timestamps.": "支持流式输出与词级时间戳的英语语音转文字。",
  "30-language speech-to-text with auto language detection.": "支持自动语言检测的 30 种语言语音转文字。",
  "5-language speech-to-text with auto language detection.": "支持自动语言检测的 5 种语言语音转文字。",
  "8-language speech-to-text with translation, auto language detection.": "支持翻译与自动语言检测的 8 种语言语音转文字。",
  "99-language speech-to-text with translation, auto language detection, segment-level timestamps.": "支持翻译、自动语言检测与句子级时间戳的 99 种语言语音转文字。",
  "English speech-to-text with segment-level timestamps.": "支持句子级时间戳的英语语音转文字。",
  "100-language speech-to-text with translation, auto language detection, segment-level timestamps.": "支持翻译、自动语言检测与句子级时间戳的 100 种语言语音转文字。",
  "Optimized for Taiwanese Mandarin. Code-switching support.": "针对台湾华语优化。支持语码转换。",
  "Optimized for Taiwanese Hokkien (Taigi). Best for Taiwanese speech.": "针对台湾闽南语优化。最适合台湾语音识别。"
};

const DESCRIPTION_TRANSLATIONS_ZH_TW: Record<string, string> = {
  "Fast, accurate live English transcription": "快速且準確的即時英語轉錄",
  "Live multilingual transcription across 28 languages": "支援 28 種語言的即時多語言轉錄",
  "Tiny and instant, runs well on any hardware": "極小且即時，在任何硬體上都能良好運行",
  "Highest accuracy, 14 languages, slower": "準確度最高，支援 14 種語言，速度較慢",
  "Broadest language, but may run a bit slow": "支援語言最廣，但運行可能稍慢",
  "Live multilingual, excellent on powerful machines": "即時多語言轉錄，在高效能機器上表現優異",
  "Fast and accurate. Supports 25 European languages": "快速且準確。支援 25 種歐洲語言",
  "English only. The best model for English speakers": "僅限英語。英語使用者的最佳模型",
  "Excellent multilingual model": "優異的多語言模型",
  "A tiny multilingual model": "極小的多語言模型",
  "4-language speech-to-text with translation.": "支援 4 種語言的語音轉文字與翻譯。",
  "25-language speech-to-text with translation.": "支援 25 種語言的語音轉文字與翻譯。",
  "English speech-to-text.": "英語語音轉文字。",
  "3-language speech-to-text.": "支援 3 種語言的語音轉文字。",
  "English speech-to-text with token-level timestamps.": "支援語詞級時間戳記的英語語音轉文字。",
  "5-language speech-to-text.": "支援 5 種語言的語音轉文字。",
  "6-language speech-to-text with translation.": "支援 6 種語言的語音轉文字與翻譯。",
  "5-language speech-to-text with word-level timestamps.": "支援單字級時間戳記的 5 種語言語音轉文字。",
  "English speech-to-text with streaming.": "支援串流的英語語音轉文字。",
  "English speech-to-text with streaming, token-level timestamps.": "支援串流與語詞級時間戳記的英語語音轉文字。",
  "30-language speech-to-text with auto language detection.": "支援自動語言偵測的 30 種語言語音轉文字。",
  "5-language speech-to-text with auto language detection.": "支援自動語言偵測的 5 種語言語音轉文字。",
  "8-language speech-to-text with translation, auto language detection.": "支援翻譯與自動語言偵測的 8 種語言語音轉文字。",
  "99-language speech-to-text with translation, auto language detection, segment-level timestamps.": "支援翻譯、自動語言偵測與句子級時間戳記的 99 種語言語音轉文字。",
  "English speech-to-text with segment-level timestamps.": "支援句子級時間戳記的英語語音轉文字。",
  "100-language speech-to-text with translation, auto language detection, segment-level timestamps.": "支援翻譯、自動語言偵測與句子級時間戳記的 100 種語言語音轉文字。",
  "Optimized for Taiwanese Mandarin. Code-switching support.": "針對臺灣華語最佳化。支援語碼轉換。",
  "Optimized for Taiwanese Hokkien (Taigi). Best for Taiwanese speech.": "針對臺灣台語最佳化。最適合臺灣語音辨識。"
};

/**
 * Get the translated description for a model
 * @param model - The model info object
 * @param t - The translation function from useTranslation
 * @returns The translated model description, or the original description if no translation exists
 */
export function getTranslatedModelDescription(
  model: ModelInfo,
  t: TFunction,
): string {
  // Custom models use a generic translation key
  if (model.is_custom) {
    return t("onboarding.customModelDescription");
  }
  const translationKey = `onboarding.models.${model.id}.description`;
  const translated = t(translationKey, { defaultValue: "" });
  const desc = translated !== "" ? translated : model.description;

  const currentLang = i18n.language;
  if (currentLang && (currentLang === "zh" || currentLang === "zh-TW" || currentLang.startsWith("zh-"))) {
    const trimmedDesc = desc.trim();
    const isTraditional = currentLang === "zh-TW" || currentLang === "zh-HK" || currentLang === "zh-Hant";
    const map = isTraditional ? DESCRIPTION_TRANSLATIONS_ZH_TW : DESCRIPTION_TRANSLATIONS_ZH_CN;
    if (map[trimmedDesc]) {
      return map[trimmedDesc];
    }
  }

  return desc;
}
