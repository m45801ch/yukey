import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Trash2 } from "lucide-react";
import { Tooltip } from "../ui/Tooltip";
import type { CorrectionRule } from "@/utils/correctionRules";
import {
  loadCorrectionRules,
  saveCorrectionRules,
  syncSystemPromptWithCorrections,
} from "@/utils/correctionRules";

const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [show]);

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow((prev) => !prev)}
    >
      <svg
        className="w-4 h-4 text-mid-gray cursor-help hover:text-logo-primary transition-colors duration-200 select-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setShow((prev) => !prev);
          }
        }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {show && (
        <Tooltip targetRef={ref} position="top">
          <p className="text-sm text-center leading-relaxed">{text}</p>
        </Tooltip>
      )}
    </div>
  );
};

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
    setRules(loadCorrectionRules());
  }, []);

  const saveRules = (updatedRules: CorrectionRule[]) => {
    setRules(updatedRules);
    saveCorrectionRules(updatedRules);
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
      syncSystemPromptWithCorrections(rules, updated, getSetting);

      setNewWord("");
      toast.success(t("pages.vocab.toastWordAdded"));
    }
  };

  // 刪除熱詞
  const handleRemoveWord = (wordToRemove: string) => {
    const updated = customWords.filter((word) => word !== wordToRemove);
    updateSetting("custom_words", updated);
    syncSystemPromptWithCorrections(rules, updated, getSetting);
  };

  // 新增糾錯規則
  const handleAddRule = () => {
    const pattern = rulePattern.trim();
    const replacement = ruleReplacement.trim();
    if (!pattern || !replacement) {
      toast.error(t("pages.vocab.toastFieldEmpty"));
      return;
    }
    if (rules.some((r) => r.pattern === pattern && r.replacement === replacement)) {
      toast.error(t("pages.vocab.toastRuleExists", { pattern, replacement }));
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
    syncSystemPromptWithCorrections(updatedRules, customWords, getSetting);
    setRulePattern("");
    setRuleReplacement("");
    toast.success(t("pages.vocab.toastRuleAdded"));
  };

  // 刪除糾錯規則
  const handleRemoveRule = (id: string) => {
    const updatedRules = rules.filter((r) => r.id !== id);
    saveRules(updatedRules);
    syncSystemPromptWithCorrections(updatedRules, customWords, getSetting);
    toast.success(t("pages.vocab.toastRuleRemoved"));
  };

  return (
    <div className="w-full space-y-6 pb-8 select-none text-text">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左側：自訂熱詞 */}
        <div className="p-5 rounded-xl border border-mid-gray/20 bg-background-ui/5 flex flex-col justify-between space-y-4">
          <div className="space-y-2 text-start">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-mid-gray uppercase tracking-wider">
                {t("pages.vocab.hotwordsTitle")}
              </h3>
              <InfoTooltip text={t("pages.vocab.infoHotwords")} />
            </div>
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
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-mid-gray uppercase tracking-wider">
                {t("pages.vocab.rulesTitle")}
              </h3>
              <InfoTooltip text={t("pages.vocab.infoRules")} />
            </div>
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
