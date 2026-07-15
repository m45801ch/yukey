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
import modeEmail from "./modes/email.md?raw";
// @ts-ignore
import modeLine from "./modes/line.md?raw";
// @ts-ignore
import modeSocial from "./modes/social.md?raw";
// @ts-ignore
import modeTeaching from "./modes/teaching.md?raw";
// @ts-ignore
import modeNote from "./modes/note.md?raw";
// @ts-ignore
import modeOfficial from "./modes/official.md?raw";

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
    description: "适用于日常对话与记录，修正明显口误并保持口语自然。",
    content: modeGeneral,
  },
  business: {
    name: "商务",
    description: "将随意的口述整理为正式、措辞得体的商业邮件、讯息或工作报告。",
    content: modeBusiness,
  },
  meeting: {
    name: "会议",
    description: "将会议转写内容整理为条理清晰、重点分明的会议记录。",
    content: modeMeeting,
  },
  verbatim: {
    name: "逐字稿",
    description: "完整保留所有口语、赘字、语气词与停顿，仅修正错别字。",
    content: modeVerbatim,
  },
  chat: {
    name: "聊天",
    description: "适合轻松随意的对话，保留口语情绪语气，修正错字并适当断句。",
    content: modeChat,
  },
  email: {
    name: "Email",
    description: "将口述内容整理为适合电子邮件发送的正式书信格式。",
    content: modeEmail,
  },
  line: {
    name: "LINE",
    description: "适合即时通讯的简洁口语风格，保留语气与温度。",
    content: modeLine,
  },
  social: {
    name: "社群贴文",
    description: "将语音整理为适合社群媒体的活泼、有感贴文风格。",
    content: modeSocial,
  },
  teaching: {
    name: "教学",
    description: "保留教学逻辑与层次，专有名词精确，适合学习者阅读。",
    content: modeTeaching,
  },
  notes: {
    name: "笔记",
    description: "精简浓缩为条列式笔记，保留核心资讯，去除口语赘词。",
    content: modeNote,
  },
  official: {
    name: "公文",
    description: "转换为正式公文格式与用语，适合签呈、函文等正式文书。",
    content: modeOfficial,
  },
};

export const DEFAULT_DICTIONARIES: Record<
  string,
  { name: string; description: string; content: string }
> = {
  ai: {
    name: "AI 人工智能",
    description:
      "导入人工智能、深度学习、大语言模型 (LLM) 等相关专业领域术语与英文缩写。",
    content: dictAi,
  },
  coding: {
    name: "程式开发",
    description:
      "导入前端、后端、API、Git 版本控制、软件部署与测试等计算机专业词汇。",
    content: dictCoding,
  },
  medical: {
    name: "医疗保健",
    description: "导入医学检验、常见疾病、临床诊断与医院科别之医疗专业名词。",
    content: dictMedical,
  },
  legal: {
    name: "法律合规",
    description: "导入合约条款、智慧财产权、诉讼争议解决与合规之法律专有名词。",
    content: dictLegal,
  },
  engineering: {
    name: "工程专案",
    description:
      "导入产品研发、结构设计、工程蓝图、物料制造与专案管理专业术语。",
    content: dictEngineering,
  },
  education: {
    name: "教育学习",
    description: "导入课纲教案、教学方法、辅导咨商与学校行政之教育相关词汇。",
    content: dictEducation,
  },
};
