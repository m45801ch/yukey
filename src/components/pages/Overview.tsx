import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import { commands, type HistoryEntry } from "@/bindings";
import {
  Cpu,
  Sparkles,
  FileText,
  Clock,
  BarChart3,
  ListFilter,
} from "lucide-react";
import { formatDateTime } from "@/utils/dateFormat";

interface OverviewProps {
  onNavigateToSettings?: (tab: string) => void;
  onNavigateToSection?: (section: any) => void;
}

export const Overview: React.FC<OverviewProps> = ({
  onNavigateToSettings,
  onNavigateToSection,
}) => {
  const { t, i18n } = useTranslation();
  const { currentModel, models } = useModelStore();
  const { settings } = useSettings();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 獲取目前 model 名稱
  const currentModelInfo = useMemo(() => {
    return models.find((m) => m.id === currentModel);
  }, [models, currentModel]);

  // 獲取 AI 後處理 Provider 名稱與狀態
  const postProcessStatus = useMemo(() => {
    if (!settings?.post_process_enabled) {
      return { enabled: false, label: "未啟用" };
    }
    const providerId = settings?.post_process_provider_id || "openai";
    const providers = settings?.post_process_providers || [];
    const activeProvider = providers.find((p) => p.id === providerId);
    const model = settings?.post_process_models?.[providerId] || "預設模型";
    return {
      enabled: true,
      label: `${activeProvider?.label || providerId} (${model})`,
    };
  }, [settings]);

  // 獲取所有歷史紀錄
  const loadHistory = useCallback(async () => {
    try {
      // 讀取前 200 條以進行統計
      const result = await commands.getHistoryEntries(null, 200);
      if (result.status === "ok") {
        setHistory(result.data.entries);
      }
    } catch (e) {
      console.error("Failed to load history for overview statistics", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 計算今日數據
  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todays = history.filter((entry) => {
      const entryDate = new Date(entry.timestamp);
      return entryDate >= today;
    });

    const segmentsToday = todays.length;
    const charsToday = todays.reduce(
      (acc, entry) => acc + (entry.transcription_text?.length || 0),
      0,
    );

    // 原專案無時長紀錄，以每 100 字 20 秒 (20000 ms) 進行模擬，或者 WAV 檔案大小來算。
    // 這邊以文字長度估計：一個中文字/英文單字約 0.3 秒
    const estimatedDurationSec = todays.reduce((acc, entry) => {
      const textLen = entry.transcription_text?.length || 0;
      return acc + textLen * 0.3;
    }, 0);

    const formatDuration = (sec: number) => {
      if (sec === 0) return "0 秒";
      const m = Math.floor(sec / 60);
      const s = Math.round(sec % 60);
      return m > 0 ? `${m} 分 ${s} 秒` : `${s} 秒`;
    };

    const avgChars =
      segmentsToday > 0 ? Math.round(charsToday / segmentsToday) : 0;

    return {
      segmentsToday,
      charsToday,
      durationTodayStr: formatDuration(estimatedDurationSec),
      avgChars,
      totalCount: history.length,
    };
  }, [history]);

  // 計算過去 7 天的每日聽寫段落數
  const weeklyChartData = useMemo(() => {
    const data = Array(7)
      .fill(0)
      .map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        return {
          date,
          label: date.toLocaleDateString(i18n.language, { weekday: "short" }),
          count: 0,
        };
      });

    history.forEach((entry) => {
      const entryDate = new Date(entry.timestamp);
      entryDate.setHours(0, 0, 0, 0);
      const diffTime = Date.now() - entryDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        data[6 - diffDays].count += 1;
      }
    });

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    return data.map((d) => ({
      ...d,
      percentage: (d.count / maxCount) * 100,
    }));
  }, [history, i18n.language]);

  const recentEntries = useMemo(() => {
    return history.slice(0, 5);
  }, [history]);

  return (
    <div className="w-full space-y-4 pb-1 select-none text-text">
      {/* 頂部模型與 AI 設定概覽 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => onNavigateToSettings?.("models")}
          className="flex items-center gap-4 p-4 rounded-xl border border-mid-gray/20 bg-background-ui/5 cursor-pointer glow-card-3d"
        >
          <div className="p-3 bg-logo-primary/10 text-logo-primary rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
          <div className="text-start">
            <div className="text-xs text-mid-gray uppercase tracking-wider">
              {t("sidebar.models")}
            </div>
            <div className="text-sm font-semibold">
              {currentModelInfo?.name || "未載入模型"}
            </div>
          </div>
        </div>

        <div
          onClick={() => onNavigateToSettings?.("services")}
          className="flex items-center gap-4 p-4 rounded-xl border border-mid-gray/20 bg-background-ui/5 cursor-pointer glow-card-3d"
        >
          <div className="p-3 bg-logo-primary/10 text-logo-primary rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="text-start">
            <div className="text-xs text-mid-gray uppercase tracking-wider">
              AI 修飾模型
            </div>
            <div className="text-sm font-semibold">
              {postProcessStatus.label}
            </div>
          </div>
        </div>
      </div>

      {/* 數據指標 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-mid-gray/20 bg-background-ui/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-mid-gray font-medium">
            <FileText className="w-3.5 h-3.5" />
            今日字數
          </div>
          <div className="text-2xl font-bold text-logo-primary">
            {metrics.charsToday}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-mid-gray/20 bg-background-ui/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-mid-gray font-medium">
            <Clock className="w-3.5 h-3.5" />
            今日時長
          </div>
          <div className="text-2xl font-bold text-logo-primary">
            {metrics.durationTodayStr}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-mid-gray/20 bg-background-ui/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-mid-gray font-medium">
            <ListFilter className="w-3.5 h-3.5" />
            平均段落 (字數)
          </div>
          <div className="text-2xl font-bold text-logo-primary">
            {metrics.avgChars}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-mid-gray/20 bg-background-ui/5 space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-mid-gray font-medium">
            <BarChart3 className="w-3.5 h-3.5" />
            累計紀錄
          </div>
          <div className="text-2xl font-bold text-logo-primary">
            {metrics.totalCount}
          </div>
        </div>
      </div>

      {/* 圖表分佈與最近紀錄 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* 柱狀圖 */}
        <div className="md:col-span-2 p-5 rounded-xl border border-mid-gray/20 bg-background-ui/5 flex flex-col justify-between">
          <h3 className="text-sm font-semibold text-mid-gray mb-4">
            過去 7 天聽寫次數分佈
          </h3>
          <div className="flex items-end justify-between h-[210px] px-2">
            {weeklyChartData.map((day, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center flex-1 group"
              >
                {/* 讓數字與柱體在一個靠底對齊的 Flex 容器中，實現高度隨動 */}
                <div className="w-full flex flex-col items-center justify-end h-[160px] relative">
                  <span
                    className={`text-[10px] font-semibold mb-1 transition-colors ${day.count > 0 ? "text-logo-primary" : "text-mid-gray/40"}`}
                  >
                    {day.count}
                  </span>
                  <div
                    style={{
                      height: day.count > 0 ? `${day.percentage}%` : "4px",
                    }}
                    className={`w-4 sm:w-5 rounded-t-md transition-all duration-500 ${
                      day.count > 0
                        ? "bg-logo-primary/80 group-hover:bg-logo-primary"
                        : "bg-mid-gray/20"
                    }`}
                  />
                </div>
                <span className="text-[10px] text-mid-gray mt-1 truncate w-full text-center">
                  {day.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 最近識別的紀錄 */}
        <div
          onClick={() => onNavigateToSection?.("history")}
          className="md:col-span-3 pt-3 pb-2 px-4 rounded-xl border border-mid-gray/20 bg-background-ui/5 space-y-2 glow-card-3d cursor-pointer hover:bg-mid-gray/10 transition-colors"
        >
          <h3 className="text-sm font-semibold text-mid-gray">
            最近識別的紀錄
          </h3>
          {loading ? (
            <div className="text-xs text-mid-gray py-4 text-center">
              載入中...
            </div>
          ) : recentEntries.length === 0 ? (
            <div className="text-xs text-mid-gray py-4 text-center">
              尚無聽寫紀錄
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[205px] overflow-y-auto pr-1">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-1.5 rounded-lg bg-mid-gray/5 border border-mid-gray/10 hover:border-logo-primary/30 transition-colors space-y-0.5"
                >
                  <div className="flex justify-between items-center text-[10px] text-mid-gray">
                    <span>
                      {formatDateTime(String(entry.timestamp), i18n.language)}
                    </span>
                    <span>{entry.transcription_text?.length || 0} 字</span>
                  </div>
                  <p className="text-xs font-medium line-clamp-2 break-all text-text/90">
                    {entry.transcription_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
