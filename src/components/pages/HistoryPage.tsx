import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import { Check, Copy, FolderOpen, RotateCcw, Star, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  commands,
  events,
  type HistoryEntry,
  type HistoryUpdatePayload,
} from "@/bindings";
import { useOsType } from "@/hooks/useOsType";
import { formatDateTime } from "@/utils/dateFormat";
import { AudioPlayer } from "../ui/AudioPlayer";
import { Button } from "../ui/Button";

const PAGE_SIZE = 30;

export const HistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const osType = useOsType();
  
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  const sentinelRef = useRef<HTMLDivElement>(null);
  const entriesRef = useRef<HistoryEntry[]>([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const loadPage = useCallback(async (cursor?: number) => {
    const isFirstPage = cursor === undefined;
    if (!isFirstPage && loadingRef.current) return;
    loadingRef.current = true;

    if (isFirstPage) setLoading(true);

    try {
      const result = await commands.getHistoryEntries(
        cursor ?? null,
        PAGE_SIZE,
      );
      if (result.status === "ok") {
        const { entries: newEntries, has_more } = result.data;
        setEntries((prev) => {
          const combined = isFirstPage ? newEntries : [...prev, ...newEntries];
          // 如果是第一次載入，且有條目，預設選中第一條
          if (isFirstPage && combined.length > 0 && selectedId === null) {
            setSelectedId(combined[0].id);
          }
          return combined;
        });
        setHasMore(has_more);
      }
    } catch (error) {
      console.error("Failed to load history entries:", error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [selectedId]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  // 無限滾動
  useEffect(() => {
    if (loading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (observerEntries) => {
        const first = observerEntries[0];
        if (first.isIntersecting) {
          const lastEntry = entriesRef.current[entriesRef.current.length - 1];
          if (lastEntry) {
            loadPage(lastEntry.id);
          }
        }
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading, hasMore, loadPage]);

  // 監聽後端更新
  useEffect(() => {
    const unlisten = events.historyUpdatePayload.listen((event) => {
      const payload: HistoryUpdatePayload = event.payload;
      if (payload.action === "added") {
        setEntries((prev) => {
          const updated = [payload.entry, ...prev];
          setSelectedId(payload.entry.id); // 自動選中新聽寫條目
          return updated;
        });
      } else if (payload.action === "updated") {
        setEntries((prev) =>
          prev.map((e) => (e.id === payload.entry.id ? payload.entry : e)),
        );
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const selectedEntry = useMemo(() => {
    return entries.find((e) => e.id === selectedId) || null;
  }, [entries, selectedId]);

  const toggleSaved = async (id: number) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e)),
    );
    try {
      const result = await commands.toggleHistoryEntrySaved(id);
      if (result.status !== "ok") {
        // Revert
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e)),
        );
      }
    } catch (error) {
      console.error("Failed to toggle saved status:", error);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, saved: !e.saved } : e)),
      );
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("settings.history.copied") || "已複製到剪貼簿");
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getAudioUrl = useCallback(
    async (fileName: string) => {
      try {
        const result = await commands.getAudioFilePath(fileName);
        if (result.status === "ok") {
          if (osType === "linux") {
            const fileData = await readFile(result.data);
            const blob = new Blob([fileData], { type: "audio/wav" });
            return URL.createObjectURL(blob);
          }
          return convertFileSrc(result.data, "asset");
        }
        return null;
      } catch (error) {
        console.error("Failed to get audio file path:", error);
        return null;
      }
    },
    [osType],
  );

  const deleteEntry = async (id: number) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
    try {
      const result = await commands.deleteHistoryEntry(id);
      if (result.status !== "ok") {
        loadPage();
      } else {
        toast.success("已成功刪除該筆聽寫紀錄");
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      loadPage();
    }
  };

  const openRecordingsFolder = async () => {
    try {
      const result = await commands.openRecordingsFolder();
      if (result.status !== "ok") {
        throw new Error(String(result.error));
      }
    } catch (error) {
      console.error("Failed to open recordings folder:", error);
    }
  };

  return (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 select-none text-text">
      {/* 左欄：列表 */}
      <div className="flex-1 md:w-1/3 flex flex-col border border-mid-gray/20 rounded-xl bg-background-ui/5 overflow-hidden">
        <div className="p-3 border-b border-mid-gray/20 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-mid-gray uppercase tracking-wider">聽寫列表</h3>
          <Button
            onClick={openRecordingsFolder}
            variant="secondary"
            size="sm"
            className="flex items-center gap-1.5"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>錄音資料夾</span>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-mid-gray/10">
          {loading && entries.length === 0 ? (
            <div className="p-4 text-center text-xs text-mid-gray">載入中...</div>
          ) : entries.length === 0 ? (
            <div className="p-4 text-center text-xs text-mid-gray">尚無歷史聽寫紀錄</div>
          ) : (
            <>
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className={`p-3 cursor-pointer text-start transition-colors space-y-1.5 ${
                    selectedId === entry.id
                      ? "bg-logo-primary/10 border-l-2 border-logo-primary"
                      : "hover:bg-mid-gray/5"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-mid-gray">
                    <span>{formatDateTime(String(entry.timestamp), i18n.language)}</span>
                    {entry.saved && <Star className="w-3 h-3 text-logo-primary" fill="currentColor" />}
                  </div>
                  <p className="text-xs font-medium truncate max-w-full text-text/90">
                    {entry.transcription_text}
                  </p>
                </div>
              ))}
              <div ref={sentinelRef} className="h-2" />
            </>
          )}
        </div>
      </div>

      {/* 右欄：詳情 */}
      <div className="flex-[2] md:w-2/3 flex flex-col border border-mid-gray/20 rounded-xl bg-background-ui/5 p-5 overflow-y-auto">
        {selectedEntry ? (
          <div className="space-y-6 flex flex-col h-full justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-mid-gray/20">
                <div>
                  <h4 className="text-xs font-semibold text-mid-gray">詳細時間</h4>
                  <p className="text-sm font-medium">
                    {formatDateTime(String(selectedEntry.timestamp), i18n.language)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard(selectedEntry.transcription_text)}
                    className="p-2 rounded-lg hover:bg-mid-gray/10 text-mid-gray hover:text-logo-primary transition-colors cursor-pointer"
                    title="複製文字"
                  >
                    <Copy className="w-4.5 h-4.5" />
                  </button>
                  <button
                    onClick={() => toggleSaved(selectedEntry.id)}
                    className={`p-2 rounded-lg hover:bg-mid-gray/10 transition-colors cursor-pointer ${
                      selectedEntry.saved ? "text-logo-primary" : "text-mid-gray hover:text-logo-primary"
                    }`}
                    title={selectedEntry.saved ? "取消收藏" : "加入收藏"}
                  >
                    <Star className="w-4.5 h-4.5" fill={selectedEntry.saved ? "currentColor" : "none"} />
                  </button>
                  <button
                    onClick={() => deleteEntry(selectedEntry.id)}
                    className="p-2 rounded-lg hover:bg-mid-gray/10 text-mid-gray hover:text-red-500 transition-colors cursor-pointer"
                    title="刪除"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-start">
                <h4 className="text-xs font-semibold text-mid-gray uppercase tracking-wider">原始轉錄文字 (Raw ASR)</h4>
                <div className="p-4 rounded-xl bg-mid-gray/5 border border-mid-gray/10 text-sm leading-relaxed select-text cursor-text whitespace-pre-wrap break-words">
                  {selectedEntry.transcription_text}
                </div>
              </div>

              {selectedEntry.post_processed_text && (
                <div className="space-y-2 text-start">
                  <h4 className="text-xs font-semibold text-logo-primary uppercase tracking-wider">AI 潤色修飾文字 (Polished Text)</h4>
                  <div className="p-4 rounded-xl bg-logo-primary/5 border border-logo-primary/10 text-sm leading-relaxed select-text cursor-text whitespace-pre-wrap break-words font-medium">
                    {selectedEntry.post_processed_text}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-mid-gray/20">
              <AudioPlayer
                onLoadRequest={() => getAudioUrl(selectedEntry.file_name)}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-mid-gray space-y-2">
            <p className="text-sm">選擇左側清單中的項目以查看詳情</p>
          </div>
        )}
      </div>
    </div>
  );
};
