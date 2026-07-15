export interface CorrectionRule {
  id: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
}

export function loadCorrectionRules(): CorrectionRule[] {
  const saved = localStorage.getItem("yukey_correction_rules");
  if (!saved) return [];
  try {
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

export function saveCorrectionRules(rules: CorrectionRule[]): void {
  localStorage.setItem("yukey_correction_rules", JSON.stringify(rules));
}

export function syncSystemPromptWithCorrections(
  rules: CorrectionRule[],
  customWords: string[],
  getSetting?: (key: any) => any,
): void {
  const activeRules = rules.filter((r) => r.enabled);

  let correctionPrompt = "";
  if (activeRules.length > 0) {
    correctionPrompt +=
      "\n\n# 語音識別糾錯對照表 (請務必將左方的錯字或發音模糊字，更正為右方的正確字)：\n";
    activeRules.forEach((r) => {
      correctionPrompt += `- "${r.pattern}" -> "${r.replacement}"\n`;
    });
  }

  localStorage.setItem("yukey_prompt_corrections_suffix", correctionPrompt);

  // If getSetting is not available, skip backend update (suffix in localStorage is sufficient)
  if (!getSetting) return;

  const selectedPromptId = getSetting("post_process_selected_prompt_id");
  const prompts = getSetting("post_process_prompts") || [];
  const selectedPrompt = prompts.find((p: any) => p.id === selectedPromptId);

  if (!selectedPrompt) return;

  let cleanPrompt = selectedPrompt.prompt.split("\n\n# 語音識別糾錯對照表")[0];
  cleanPrompt = cleanPrompt.split("\n# 本地熱詞")[0];
  if (
    selectedPrompt.prompt.includes("${output}") &&
    !cleanPrompt.includes("${output}")
  ) {
    const ti = selectedPrompt.prompt.lastIndexOf("Transcript:");
    const oi = selectedPrompt.prompt.lastIndexOf("${output}");
    if (ti !== -1 && oi !== -1) {
      cleanPrompt =
        cleanPrompt.trimEnd() +
        "\n\n" +
        selectedPrompt.prompt.slice(ti, oi + 9);
    }
  }

  const newPromptText = correctionPrompt
    ? (() => {
        const clean = correctionPrompt.trimStart();
        const idx = cleanPrompt.lastIndexOf("Transcript:");
        return idx !== -1
          ? cleanPrompt.slice(0, idx) +
              clean +
              "\n\n" +
              cleanPrompt.slice(idx)
          : cleanPrompt.replace("${output}", clean + "\n\n${output}");
      })()
    : cleanPrompt;

  import("@/bindings").then(({ commands: cmds }) => {
    cmds.updatePostProcessPrompt(
      selectedPrompt.id,
      selectedPrompt.name,
      newPromptText,
    );
  });
}

export function addCorrectionRule(
  pattern: string,
  replacement: string,
  customWords: string[],
  getSetting?: (key: any) => any,
): CorrectionRule[] {
  const rules = loadCorrectionRules();
  const newRule: CorrectionRule = {
    id: Math.random().toString(36).substring(2, 9),
    pattern,
    replacement,
    enabled: true,
  };
  const updated = [newRule, ...rules];
  saveCorrectionRules(updated);
  syncSystemPromptWithCorrections(updated, customWords, getSetting);
  return updated;
}
