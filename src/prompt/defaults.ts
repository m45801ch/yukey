// @ts-ignore
import mainPrompt from "./main.md?raw";

// @ts-ignore
import modeGeneral from "./modes/general.md?raw";
// @ts-ignore
import modeBusiness from "./modes/business.md?raw";
// @ts-ignore
import modeMeeting from "./modes/meeting.md?raw";
// @ts-ignore
import modeVerbatim from "./modes/verbatim.md?raw";
// @ts-ignore
import modeChat from "./modes/chat.md?raw";

// @ts-ignore
import dictAi from "./dictionary/ai.md?raw";
// @ts-ignore
import dictCoding from "./dictionary/coding.md?raw";
// @ts-ignore
import dictMedical from "./dictionary/medical.md?raw";
// @ts-ignore
import dictLegal from "./dictionary/legal.md?raw";
// @ts-ignore
import dictEngineering from "./dictionary/engineering.md?raw";
// @ts-ignore
import dictEducation from "./dictionary/education.md?raw";

export const DEFAULT_MAIN_PROMPT = mainPrompt;

export const DEFAULT_MODES: Record<
  string,
  { name: string; description: string; content: string }
> = {
  general: {
    name: "一般",
    description: "適用於日常對話與記錄，修正明顯口誤並保持口語自然。",
    content: modeGeneral,
  },
  business: {
    name: "商務",
    description: "將隨意的口述整理為正式、措辭得體的商業郵件、訊息或工作報告。",
    content: modeBusiness,
  },
  meeting: {
    name: "會議",
    description: "將會議轉寫內容整理為條理清晰、重點分明的會議紀錄。",
    content: modeMeeting,
  },
  verbatim: {
    name: "逐字稿",
    description: "完整保留所有口語、贅字、語氣詞與停頓，僅修正錯別字。",
    content: modeVerbatim,
  },
  chat: {
    name: "聊天",
    description: "適合輕鬆隨意的對話，保留口語情緒語氣，修正錯字並適當斷句。",
    content: modeChat,
  },
};

export const DEFAULT_DICTIONARIES: Record<
  string,
  { name: string; description: string; content: string }
> = {
  ai: {
    name: "AI 人工智慧",
    description:
      "導入人工智慧、深度學習、大語言模型 (LLM) 等相關專業領域術語與英文縮寫。",
    content: dictAi,
  },
  coding: {
    name: "程式開發",
    description:
      "導入前端、後端、API、Git 版本控制、軟體部署與測試等資工專業詞彙。",
    content: dictCoding,
  },
  medical: {
    name: "醫療保健",
    description: "導入醫學檢驗、常見疾病、臨床診斷與醫院科別之醫療專業名詞。",
    content: dictMedical,
  },
  legal: {
    name: "法律合規",
    description: "導入合約條款、智慧財產權、訴訟爭議解決與合規之法律專有名詞。",
    content: dictLegal,
  },
  engineering: {
    name: "工程專案",
    description:
      "導入產品研發、結構設計、工程藍圖、物料製造與專案管理專業術語。",
    content: dictEngineering,
  },
  education: {
    name: "教育學習",
    description: "導入課綱教案、教學方法、輔導諮商與學校行政之教育相關詞彙。",
    content: dictEducation,
  },
};
