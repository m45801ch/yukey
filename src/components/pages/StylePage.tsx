import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useSettings } from "@/hooks/useSettings";
import { commands } from "@/bindings";
import { Sparkles, Check, Plus, Edit2, Trash2, RotateCcw } from "lucide-react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { Button } from "../ui/Button";

// 內建的固定風格樣板默認值與說明
const DEFAULT_PRESETS = [
  {
    id: "default_improve_transcriptions",
    name: "Improve Transcriptions",
    description: "清理與修正轉錄內容，修正拼寫、大小寫及標點符號，並將口頭數字轉換為阿拉伯數字。",
    prompt: "Clean this transcript:\n1. Fix spelling, capitalization, and punctuation errors\n2. Convert number words to digits (twenty-five → 25, ten percent → 10%, five dollars → $5)\n3. Replace spoken punctuation with symbols (period → ., comma → ,, question mark → ?)\n4. Remove filler words (um, uh, like as filler)\n5. Keep the language in the original version (if it was french, keep it in french for example)\n\nPreserve exact meaning and word order. Do not paraphrase or reorder content.\n\nReturn only the cleaned transcript.\n\nTranscript:\n${output}"
  },
  {
    id: "preset_rewrite",
    name: "AI 預設潤色",
    description: "修飾口語與語氣，修正標點與口誤，使語意連貫流暢。",
    prompt: "你是語音輸入潤色助手。請理解用戶的口語轉寫意圖，修正其中的口誤、重複詞、贅字以及標點符號，將其整理為流暢、自然且符合書面語句的中文，不要改變原意。\n\n${output}",
  },
  {
    id: "preset_business",
    name: "正式商務",
    description: "將隨意的語音口述轉換為語氣正式、措辭得體的商業郵件或訊息。",
    prompt: "請將用戶輸入的語音轉寫文字，轉換成語氣正式、措辭得體、段落清晰的商業書信或專業工作回報。修飾過於隨意的口語，使其符合專業職場的溝通標準。\n\n${output}",
  },
  {
    id: "preset_code_comment",
    name: "程式碼註解",
    description: "將口頭邏輯描述，提煉為簡潔、格式規範的程式碼註解或開發說明文件。",
    prompt: "請將用戶輸入的開發邏輯或口語描述，提煉並改寫為簡潔、清晰、格式規範的程式碼註解（使用Markdown代碼塊或標準註解符號）或技術說明文檔。\n\n${output}",
  },
  {
    id: "preset_translate_en",
    name: "中英對譯",
    description: "智慧辨識輸入語言並轉換，中文語音翻譯為英文，英文翻譯為中文。",
    prompt: "你是語音翻譯助手。如果輸入是中文，請將其翻譯為流暢自然的英文；如果輸入是英文，請將其翻譯為流暢自然的中文。只輸出翻譯結果即可。\n\n${output}",
  }
];

export const StylePage: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, refreshSettings } = useSettings();

  const prompts = getSetting("post_process_prompts") || [];
  const selectedPromptId = getSetting("post_process_selected_prompt_id") || "";

  // 編輯與新增風格的狀態
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardName, setCardName] = useState("");
  const [cardPrompt, setCardPrompt] = useState("");

  // 合併 Preset 與後端 prompts 供卡牌展示
  const allCards = useMemo(() => {
    const cards: Array<{
      id: string;
      name: string;
      description: string;
      prompt: string;
      isPreset: boolean;
      isInitialized: boolean;
      isModified: boolean;
      defaultPrompt: string;
    }> = [];

    // 1. 先處理 5 個預設的 Presets
    DEFAULT_PRESETS.forEach((preset) => {
      // 檢查後端 prompts 是否已存在相同名稱的 prompt
      const backendPrompt = prompts.find((p) => p.name === preset.name);
      
      if (backendPrompt) {
        // 已在後端初始化
        const previewPrompt = backendPrompt.prompt.split("\n\n# 語音識別糾錯對照表")[0].split("\n# 本地熱詞")[0];
        cards.push({
          id: backendPrompt.id,
          name: backendPrompt.name,
          description: preset.description,
          prompt: previewPrompt,
          isPreset: true,
          isInitialized: true,
          isModified: previewPrompt.trim() !== preset.prompt.trim(),
          defaultPrompt: preset.prompt,
        });
      } else {
        // 尚未在後端初始化
        cards.push({
          id: preset.id, // 暫時的前端 ID
          name: preset.name,
          description: preset.description,
          prompt: preset.prompt,
          isPreset: true,
          isInitialized: false,
          isModified: false,
          defaultPrompt: preset.prompt,
        });
      }
    });

    // 2. 處理自訂的 Prompts (後端存在但名稱不在 5 個預設中的)
    prompts.forEach((p) => {
      const isPresetName = DEFAULT_PRESETS.some((preset) => preset.name === p.name);
      if (!isPresetName) {
        const previewPrompt = p.prompt.split("\n\n# 語音識別糾錯對照表")[0].split("\n# 本地熱詞")[0];
        cards.push({
          id: p.id,
          name: p.name,
          description: "自訂風格，隨時編輯。",
          prompt: previewPrompt,
          isPreset: false,
          isInitialized: true,
          isModified: false,
          defaultPrompt: "",
        });
      }
    });

    return cards;
  }, [prompts]);

  // 選取風格卡片，並同步寫入 System Prompt
  const handleSelectCard = async (card: typeof allCards[0]) => {
    let backendPromptId = card.id;

    // 如果該預設風格尚未在後端建立，先建立它
    if (card.isPreset && !card.isInitialized) {
      try {
        const result = await commands.addPostProcessPrompt(card.name, card.prompt);
        if (result.status === "ok") {
          backendPromptId = result.data.id;
          await refreshSettings();
        }
      } catch (e) {
        console.error("Failed to initialize preset in backend", e);
        return;
      }
    }

    // 獲取當前詞彙頁面中已快取的對照字尾
    const correctionsSuffix = localStorage.getItem("yukey_prompt_corrections_suffix") || "";
    const finalPromptText = card.prompt + correctionsSuffix;

    try {
      await commands.updatePostProcessPrompt(backendPromptId, card.name, finalPromptText);
      await refreshSettings();
      await updateSetting("post_process_selected_prompt_id", backendPromptId);
      toast.success(`已切換 AI 風格為：「${card.name}」`);
    } catch (e) {
      console.error("Failed to update selected prompt content", e);
    }
  };

  // 打開自訂風格新增編輯器
  const handleOpenCreator = () => {
    setEditingCardId(null);
    setCardName("");
    setCardPrompt("");
    setEditorOpen(true);
  };

  // 打開修改編輯器 (Preset 與自訂皆可編輯)
  const handleOpenEditor = (card: typeof allCards[0]) => {
    setEditingCardId(card.id);
    setCardName(card.name);
    setCardPrompt(card.prompt);
    setEditorOpen(true);
  };

  // 儲存卡片 (自訂與 Preset 皆儲存到後端)
  const handleSaveCard = async () => {
    if (!cardName.trim() || !cardPrompt.trim()) return;

    let processedPrompt = cardPrompt.trim();
    // 如果提示詞中未包含 ${output} 預設字眼，則自動拼接到尾部
    if (!processedPrompt.includes("${output}")) {
      processedPrompt = `${processedPrompt}\n\n\${output}`;
    }
    
    try {
      const correctionsSuffix = localStorage.getItem("yukey_prompt_corrections_suffix") || "";
      const finalPromptText = processedPrompt + correctionsSuffix;

      if (editingCardId) {
        const isPresetId = DEFAULT_PRESETS.some((preset) => preset.id === editingCardId);
        const card = allCards.find((c) => c.id === editingCardId);

        if (isPresetId && card && !card.isInitialized) {
          // 尚未在後端建立的預設卡片 -> 直接建立新 Prompt
          const result = await commands.addPostProcessPrompt(cardName.trim(), finalPromptText);
          if (result.status === "ok") {
            await updateSetting("post_process_selected_prompt_id", result.data.id);
            toast.success("風格更新成功");
          }
        } else {
          // 已在後端建立的卡片 -> 直接更新
          await commands.updatePostProcessPrompt(editingCardId, cardName.trim(), finalPromptText);
          toast.success("風格更新成功");
        }
      } else {
        // 全新新增自訂風格
        const result = await commands.addPostProcessPrompt(cardName.trim(), finalPromptText);
        if (result.status === "ok") {
          await updateSetting("post_process_selected_prompt_id", result.data.id);
          toast.success("已新增自訂風格，且設為啟用中");
        }
      }
      await refreshSettings();
      setEditorOpen(false);
    } catch (e) {
      console.error("Failed to save card", e);
    }
  };

  // 刪除自訂卡片
  const handleDeleteCard = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」風格卡片嗎？`)) return;
    try {
      await commands.deletePostProcessPrompt(id);
      await refreshSettings();
      // 如果被刪除的是當前啟用中，自動重置為第一個
      if (selectedPromptId === id) {
        updateSetting("post_process_selected_prompt_id", null);
      }
      toast.success("風格卡片已刪除");
    } catch (e) {
      console.error("Failed to delete custom card", e);
    }
  };

  // 恢復預設值 (卡牌直接點擊一鍵復原)
  const handleResetPreset = async (id: string) => {
    const presetInfo = allCards.find((c) => c.id === id);
    if (!presetInfo) return;
    try {
      const correctionsSuffix = localStorage.getItem("yukey_prompt_corrections_suffix") || "";
      const finalPromptText = presetInfo.defaultPrompt + correctionsSuffix;
      await commands.updatePostProcessPrompt(id, presetInfo.name, finalPromptText);
      await refreshSettings();
      toast.success(`「${presetInfo.name}」已恢復為預設設定`);
    } catch (e) {
      console.error("Failed to reset preset prompt", e);
    }
  };

  // 檢查該卡片是否被選中（當前啟用中）
  const isCardActive = (card: typeof allCards[0]) => {
    if (selectedPromptId) {
      if (card.isInitialized) {
        return selectedPromptId === card.id;
      }
      return false;
    }
    // 預設第一個卡片 Improve Transcriptions
    return card.name === "Improve Transcriptions";
  };

  return (
    <div className="w-full space-y-6 pb-8 select-none text-text">
      {/* 頂部標題 */}
      <div className="flex justify-between items-center text-start">
        <div>
          <h2 className="text-lg font-bold">AI 修飾風格選擇</h2>
          <p className="text-xs text-mid-gray mt-1">選擇用於最佳化轉錄的範本或建立新範本。在提示詞文字中使用 <code>{"${output}"}</code> 來引用轉錄結果。</p>
        </div>
        <Button onClick={handleOpenCreator} variant="primary" size="md" className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>新建風格</span>
        </Button>
      </div>

      {/* 編輯器 Modal 抽屜 */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-background border border-mid-gray/20 rounded-2xl p-6 space-y-4 shadow-2xl text-start">
            <div className="flex justify-between items-center border-b border-mid-gray/10 pb-2">
              <h3 className="text-md font-semibold text-logo-primary">
                {editingCardId ? "編輯風格" : "新建 AI 修飾風格"}
              </h3>
              {editingCardId && (
                (() => {
                  const card = allCards.find((c) => c.id === editingCardId);
                  const isPreset = card?.isPreset;
                  if (isPreset) {
                    return (
                      <button
                        onClick={() => {
                          if (card?.defaultPrompt) {
                            setCardPrompt(card.defaultPrompt);
                            toast.success("已將輸入框內容重設為預設提示詞");
                          }
                        }}
                        className="p-1 px-2 rounded-md hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold border border-mid-gray/20"
                        title="恢復預設提示詞"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>恢復預設</span>
                      </button>
                    );
                  }
                  return null;
                })()
              )}
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-mid-gray">風格名稱</label>
              <Input
                type="text"
                className="w-full"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="例如：週報整理"
                disabled={editingCardId !== null && allCards.find((c) => c.id === editingCardId)?.isPreset} // 預設風格名稱不開放修改
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-mid-gray">AI 提示詞說明 (System Prompt)</label>
              <Textarea
                className="w-full h-44 text-sm"
                value={cardPrompt}
                onChange={(e) => setCardPrompt(e.target.value)}
                placeholder={"撰寫轉錄後要執行的指令。範例：改善以下文字的語法 and 清晰度: ${output}"}
              />
              <p className="text-[11px] text-mid-gray mt-1 leading-relaxed">
                提示：您的風格中必須使用 <code>{"${output}"}</code> 作為轉錄語音的佔位符，若儲存時未填寫，系統將會自動在末端為您追加此變數。
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button onClick={() => setEditorOpen(false)} variant="secondary" size="md">
                取消
              </Button>
              <Button onClick={handleSaveCard} disabled={!cardName.trim() || !cardPrompt.trim()} variant="primary" size="md">
                儲存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 卡片網格列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allCards.map((card) => {
          const active = isCardActive(card);
          return (
            <div
              key={card.id}
              onClick={() => handleSelectCard(card)}
              className={`p-5 rounded-2xl border cursor-pointer flex flex-col justify-between text-start relative group select-none min-h-48 glow-card-3d ${
                active
                  ? "border-logo-primary bg-logo-primary/5 active-glow-3d scale-[1.01]"
                  : "border-mid-gray/20 bg-background-ui/5 hover:border-logo-primary/40"
              }`}
            >
              {/* 卡片標題與啟用標籤 */}
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    card.isPreset ? "bg-mid-gray/10 text-mid-gray" : "bg-logo-primary/20 text-logo-primary"
                  }`}>
                    {card.isPreset ? "預設" : "自訂"}
                  </span>
                  {active && (
                    <span className="flex items-center gap-1 text-xs font-bold text-logo-primary">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      啟用中
                    </span>
                  )}
                </div>
                <h3 className="text-md font-bold group-hover:text-logo-primary transition-colors">{card.name}</h3>
                <p className="text-xs text-mid-gray leading-relaxed line-clamp-3">{card.description}</p>
              </div>

              {/* 操作按鈕 */}
              <div
                className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity mt-4"
                onClick={(e) => e.stopPropagation()} // 阻止觸發 selectCard
              >
                <button
                  onClick={() => handleOpenEditor(card)}
                  className="p-1.5 rounded-md hover:bg-logo-primary/10 text-mid-gray hover:text-logo-primary transition-colors cursor-pointer"
                  title="編輯風格"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                
                {card.isPreset ? (
                  card.isModified && (
                    <button
                      onClick={() => handleResetPreset(card.id)}
                      className="px-2 py-1 text-xs font-bold rounded-md bg-logo-primary/10 text-logo-primary hover:bg-logo-primary/20 transition-colors cursor-pointer"
                      title="恢復為預設提示詞"
                    >
                      一鍵復原
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleDeleteCard(card.id, card.name)}
                    className="p-1.5 rounded-md hover:bg-logo-primary/10 text-mid-gray hover:text-red-500 transition-colors cursor-pointer"
                    title="刪除風格"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
