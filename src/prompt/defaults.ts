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
  { nameKey: string; descriptionKey: string; content: string }
> = {
  general: {
    nameKey: "prompts.modes.general.name",
    descriptionKey: "prompts.modes.general.description",
    content: modeGeneral,
  },
  business: {
    nameKey: "prompts.modes.business.name",
    descriptionKey: "prompts.modes.business.description",
    content: modeBusiness,
  },
  meeting: {
    nameKey: "prompts.modes.meeting.name",
    descriptionKey: "prompts.modes.meeting.description",
    content: modeMeeting,
  },
  verbatim: {
    nameKey: "prompts.modes.verbatim.name",
    descriptionKey: "prompts.modes.verbatim.description",
    content: modeVerbatim,
  },
  chat: {
    nameKey: "prompts.modes.chat.name",
    descriptionKey: "prompts.modes.chat.description",
    content: modeChat,
  },
  email: {
    nameKey: "prompts.modes.email.name",
    descriptionKey: "prompts.modes.email.description",
    content: modeEmail,
  },
  line: {
    nameKey: "prompts.modes.line.name",
    descriptionKey: "prompts.modes.line.description",
    content: modeLine,
  },
  social: {
    nameKey: "prompts.modes.social.name",
    descriptionKey: "prompts.modes.social.description",
    content: modeSocial,
  },
  teaching: {
    nameKey: "prompts.modes.teaching.name",
    descriptionKey: "prompts.modes.teaching.description",
    content: modeTeaching,
  },
  notes: {
    nameKey: "prompts.modes.notes.name",
    descriptionKey: "prompts.modes.notes.description",
    content: modeNote,
  },
  official: {
    nameKey: "prompts.modes.official.name",
    descriptionKey: "prompts.modes.official.description",
    content: modeOfficial,
  },
};

export const DEFAULT_DICTIONARIES: Record<
  string,
  { nameKey: string; descriptionKey: string; content: string }
> = {
  ai: {
    nameKey: "prompts.dicts.ai.name",
    descriptionKey: "prompts.dicts.ai.description",
    content: dictAi,
  },
  coding: {
    nameKey: "prompts.dicts.coding.name",
    descriptionKey: "prompts.dicts.coding.description",
    content: dictCoding,
  },
  medical: {
    nameKey: "prompts.dicts.medical.name",
    descriptionKey: "prompts.dicts.medical.description",
    content: dictMedical,
  },
  legal: {
    nameKey: "prompts.dicts.legal.name",
    descriptionKey: "prompts.dicts.legal.description",
    content: dictLegal,
  },
  engineering: {
    nameKey: "prompts.dicts.engineering.name",
    descriptionKey: "prompts.dicts.engineering.description",
    content: dictEngineering,
  },
  education: {
    nameKey: "prompts.dicts.education.name",
    descriptionKey: "prompts.dicts.education.description",
    content: dictEducation,
  },
};
