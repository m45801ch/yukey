/* eslint-disable i18next/no-literal-string */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useModelStore } from "@/stores/modelStore";
import { useSettings } from "@/hooks/useSettings";
import { commands, type HistoryEntry, type UsageSummary } from "@/bindings";
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
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
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

  // 獲取歷史紀錄與統計資料
  const loadData = useCallback(async () => {
    try {
      // 讀取前 5 條以進行最近紀錄顯示
      const historyResult = await commands.getHistoryEntries(null, 5);
      if (historyResult.status === "ok") {
        setHistory(historyResult.data.entries);
      }

      // 讀取過去 7 天的獨立使用量統計
      const usageResult = await commands.getUsageStats(7);
      if (usageResult.status === "ok") {
        setUsageSummary(usageResult.data);
      }
    } catch (e) {
      console.error("Failed to load history for overview statistics", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 計算今日與累計數據
  const metrics = useMemo(() => {
    const todayStat = usageSummary?.daily_stats && usageSummary.daily_stats.length > 0
      ? usageSummary.daily_stats[usageSummary.daily_stats.length - 1]
      : null;

    const segmentsToday = todayStat?.count || 0;
    const charsToday = todayStat?.char_count || 0;
    const estimatedDurationSec = todayStat?.estimated_duration_sec || 0;

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
      totalCount: usageSummary?.all_time_count || 0,
    };
  }, [usageSummary]);

  // 計算過去 7 天的每日聽寫段落數
  const weeklyChartData = useMemo(() => {
    if (!usageSummary || !usageSummary.daily_stats) return [];

    const maxCount = Math.max(...usageSummary.daily_stats.map((d) => d.count), 1);
    
    return usageSummary.daily_stats.map((stat) => {
      const dateParts = stat.date.split("-");
      const date = new Date(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10)
      );

      return {
        date,
        label: date.toLocaleDateString(i18n.language, { weekday: "short" }),
        count: stat.count,
        percentage: (stat.count / maxCount) * 100,
      };
    });
  }, [usageSummary, i18n.language]);

  const recentEntries = useMemo(() => {
    return history;
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
