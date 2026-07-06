import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Trash2, AlertCircle } from "lucide-react";

interface CorrectionRule {
  id: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
}

export const VocabPage: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, isUpdating } = useSettings();
  const [newWord, setNewWord] = useState("");

  // 糾錯對照規則狀態
  const [rules, setRules] = useState<CorrectionRule[]>([]);
  const [rulePattern, setRulePattern] = useState("");
  const [ruleReplacement, setRuleReplacement] = useState("");

  const customWords = getSetting("custom_words") || [];

  // 初始化與加載本地模擬的糾錯規則
  useEffect(() => {
    const savedRules = localStorage.getItem("yukey_correction_rules");
    if (savedRules) {
      try {
        setRules(JSON.parse(savedRules));
      } catch (e) {
        console.error("Failed to parse local correction rules", e);
      }
    }
  }, []);

  const saveRules = (updatedRules: CorrectionRule[]) => {
    setRules(updatedRules);
    localStorage.setItem(
      "yukey_correction_rules",
      JSON.stringify(updatedRules),
    );
  };

  // 添加熱詞
  const handleAddWord = () => {
    const trimmedWord = newWord.trim();
    const sanitizedWord = trimmedWord.replace(/[<>"'&]/g, "");
    if (
      sanitizedWord &&
      !sanitizedWord.includes(" ") &&
      sanitizedWord.length <= 50
    ) {
      if (customWords.includes(sanitizedWord)) {
        toast.error(t("pages.vocab.toastWordExists", { word: sanitizedWord }));
        return;
      }
      const updated = [...customWords, sanitizedWord];
      updateSetting("custom_words", updated);

      // 更新對照 System Prompt 用的糾錯字/自訂詞彙
      syncSystemPromptWithCorrections(rules, updated);

      setNewWord("");
      toast.success(t("pages.vocab.toastWordAdded"));
    }
  };

  // 刪除熱詞
  const handleRemoveWord = (wordToRemove: string) => {
    const updated = customWords.filter((word) => word !== wordToRemove);
    updateSetting("custom_words", updated);
    syncSystemPromptWithCorrections(rules, updated);
  };

  // 新增糾錯規則
  const handleAddRule = () => {
    const pattern = rulePattern.trim();
    const replacement = ruleReplacement.trim();
    if (!pattern || !replacement) {
      toast.error(t("pages.vocab.toastFieldEmpty"));
      return;
    }
    if (rules.some((r) => r.pattern === pattern)) {
      toast.error(t("pages.vocab.toastRuleExists", { pattern }));
      return;
    }
    const newRule: CorrectionRule = {
      id: Math.random().toString(36).substring(2, 9),
      pattern,
      replacement,
      enabled: true,
    };
    const updatedRules = [newRule, ...rules];
    saveRules(updatedRules);
    syncSystemPromptWithCorrections(updatedRules, customWords);
    setRulePattern("");
    setRuleReplacement("");
    toast.success(t("pages.vocab.toastRuleAdded"));
  };

  // 刪除糾錯規則
  const handleRemoveRule = (id: string) => {
    const updatedRules = rules.filter((r) => r.id !== id);
    saveRules(updatedRules);
    syncSystemPromptWithCorrections(updatedRules, customWords);
    toast.success(t("pages.vocab.toastRuleRemoved"));
  };

  // 同步糾錯規則至原 System Prompt（透過前端注入，當後處理執行時即可遵循）
  const syncSystemPromptWithCorrections = (
    currentRules: CorrectionRule[],
    currentWords: string[],
  ) => {
    const activeRules = currentRules.filter((r) => r.enabled);

    // 構造 Prompt 說明
    let correctionPrompt = "";
    if (activeRules.length > 0) {
      correctionPrompt +=
        "\n\n# 語音識別糾錯對照表 (請務必將左方的錯字或發音模糊字，更正為右方的正確字)：\n";
      activeRules.forEach((r) => {
        correctionPrompt += `- "${r.pattern}" -> "${r.replacement}"\n`;
      });
    }

    // 保存到本地快取中，當 Style 卡片切換 System Prompt 時，會自動拼接此 correctionPrompt 在末尾
    localStorage.setItem("yukey_prompt_corrections_suffix", correctionPrompt);

    // 同步更新當前啟用中的 System Prompt (讀取 settings 裡面已有的 prompt，先清掉舊對照，然後拼上新的)
    const selectedPromptId = getSetting("post_process_selected_prompt_id");
    const prompts = getSetting("post_process_prompts") || [];
    const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

    if (selectedPrompt) {
      // 清理原先可能殘留的糾錯與熱詞區塊，保留 ${output}
      let cleanPrompt =
        selectedPrompt.prompt.split("\n\n# 語音識別糾錯對照表")[0];
      cleanPrompt = cleanPrompt.split("\n# 本地熱詞")[0];
      // 若切完後 ${output} 不見了，從原始字串找回並接回
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

      // 更新原後端所選提示詞內容
      commands
        .updatePostProcessPrompt(
          selectedPrompt.id,
          selectedPrompt.name,
          newPromptText,
        )
        .then(() => {
          updateSetting("post_process_selected_prompt_id", selectedPrompt.id);
        });
    }
  };

  return (
    <div className="w-full space-y-6 pb-8 select-none text-text">
      {/* 頂部引導說明 */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-logo-primary/20 bg-logo-primary/5 text-start">
        <AlertCircle className="w-5 h-5 text-logo-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-logo-primary">{t("pages.vocab.infoTitle")}</p>
          <p className="text-mid-gray">
            {t("pages.vocab.infoHotwords")}
          </p>
          <p className="text-mid-gray">
            {t("pages.vocab.infoRules")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左側：自訂熱詞 */}
        <div className="p-5 rounded-xl border border-mid-gray/20 bg-background-ui/5 flex flex-col justify-between space-y-4">
          <div className="space-y-2 text-start">
            <h3 className="text-sm font-semibold text-mid-gray uppercase tracking-wider">
              {t("pages.vocab.hotwordsTitle")}
            </h3>
            <p className="text-xs text-mid-gray/80">{t("pages.vocab.hotwordsDescription")}</p>
            <div className="flex gap-2">
              <Input
                type="text"
                className="flex-1"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddWord()}
                placeholder={t("pages.vocab.hotwordsPlaceholder")}
                variant="compact"
                disabled={isUpdating("custom_words")}
              />
              <Button
                onClick={handleAddWord}
                disabled={
                  !newWord.trim() ||
                  newWord.includes(" ") ||
                  isUpdating("custom_words")
                }
                variant="primary"
                size="md"
              >
                {t("pages.vocab.addHotword")}
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-36 max-h-60 overflow-y-auto p-3 rounded-lg border border-mid-gray/10 bg-mid-gray/5 flex flex-wrap gap-1.5 items-start content-start">
            {customWords.length === 0 ? (
              <span className="text-xs text-mid-gray py-4 w-full text-center">
                {t("pages.vocab.noHotwords")}
              </span>
            ) : (
              customWords.map((word) => (
                <button
                  key={word}
                  onClick={() => handleRemoveWord(word)}
                  disabled={isUpdating("custom_words")}
                  className="px-2 py-1 rounded-md text-xs bg-mid-gray/10 hover:bg-logo-primary/20 border border-mid-gray/20 hover:border-logo-primary/40 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{word}</span>
                  <span className="text-[10px] text-mid-gray hover:text-logo-primary">
                    &times;
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 右側：糾錯規則對照表 */}
        <div className="p-5 rounded-xl border border-mid-gray/20 bg-background-ui/5 flex flex-col justify-between space-y-4">
          <div className="space-y-2 text-start">
            <h3 className="text-sm font-semibold text-mid-gray uppercase tracking-wider">
              {t("pages.vocab.rulesTitle")}
            </h3>
            <p className="text-xs text-mid-gray/80">
              {t("pages.vocab.rulesDescription")}
            </p>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                className="w-1/2"
                value={rulePattern}
                onChange={(e) => setRulePattern(e.target.value)}
                placeholder={t("pages.vocab.rulePatternPlaceholder")}
                variant="compact"
              />
              <span className="text-xs text-mid-gray">&rarr;</span>
              <Input
                type="text"
                className="w-1/2"
                value={ruleReplacement}
                onChange={(e) => setRuleReplacement(e.target.value)}
                placeholder={t("pages.vocab.ruleReplacementPlaceholder")}
                variant="compact"
              />
              <Button
                onClick={handleAddRule}
                disabled={!rulePattern.trim() || !ruleReplacement.trim()}
                variant="primary"
                size="md"
                className="whitespace-nowrap shrink-0"
              >
                {t("pages.vocab.addRule")}
              </Button>
            </div>
          </div>

          <div className="flex-1 min-h-36 max-h-60 overflow-y-auto rounded-lg border border-mid-gray/10 bg-mid-gray/5 divide-y divide-mid-gray/10 text-start">
            {rules.length === 0 ? (
              <div className="text-xs text-mid-gray py-4 text-center">
                {t("pages.vocab.noRules")}
              </div>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex justify-between items-center p-3 text-xs"
                >
                  <div className="flex gap-2 items-center">
                    <span className="font-semibold text-red-400 line-through">
                      {rule.pattern}
                    </span>
                    <span className="text-mid-gray">&rarr;</span>
                    <span className="font-semibold text-logo-primary">
                      {rule.replacement}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveRule(rule.id)}
                    className="p-1 rounded text-mid-gray hover:text-red-500 hover:bg-mid-gray/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
