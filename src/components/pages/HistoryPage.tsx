import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  Check,
  Copy,
  FolderOpen,
  RotateCcw,
  Search,
  Star,
  Trash2,
  Download,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ask, save } from "@tauri-apps/plugin-dialog";
import {
  commands,
  events,
  type HistoryEntry,
  type HistoryUpdatePayload,
  type HistoryStats,
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
  const [historyCopyTargets, setHistoryCopyTargets] = useState<Record<number, "raw" | "polished">>({});
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [filter, setFilter] = useState<"all" | "saved" | "audio">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedEntry = useMemo(() => {
    return entries.find((e) => e.id === selectedId) || null;
  }, [entries, selectedId]);

  const currentCopyTarget = selectedId !== null ? historyCopyTargets[selectedId] : undefined;

  const sentinelRef = useRef<HTMLDivElement>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "saved" && e.saved) ||
        (filter === "audio" && e.file_name && e.file_name.trim().length > 0);
      const matchesSearch =
        !searchQuery.trim() ||
        e.transcription_text
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [entries, filter, searchQuery]);

  const loadStats = useCallback(async () => {
    try {
      const result = await commands.getHistoryStats();
      if (result.status === "ok") {
        setStats(result.data);
      }
    } catch (error) {
      console.error("Failed to load history stats:", error);
    }
  }, []);
  const entriesRef = useRef<HistoryEntry[]>([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  const loadPage = useCallback(
    async (cursor?: number) => {
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
            const combined = isFirstPage
              ? newEntries
              : [...prev, ...newEntries];
            // 如果是第一次載入，且有條目，預設選中第一條
            if (isFirstPage && combined.length > 0 && selectedId === null) {
              setSelectedId(combined[0].id);
            }
            return combined;
          });
          setHasMore(has_more);
          loadStats();
        }
      } catch (error) {
        console.error("Failed to load history entries:", error);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [selectedId],
  );

  useEffect(() => {
    loadPage();
    loadStats();
  }, [loadPage, loadStats]);

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
        loadStats();
      } else if (payload.action === "cleared") {
        setEntries((prev) => prev.filter((e) => e.saved));
        setSelectedId((prevId) => {
          if (prevId === null) return null;
          const stillSaved = entriesRef.current.some(
            (e) => e.id === prevId && e.saved,
          );
          return stillSaved ? prevId : null;
        });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);



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
        loadStats();
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      loadPage();
    }
  };

  const clearAllHistory = async () => {
    const confirmed = await ask(
      "確定要清空所有的歷史聽寫紀錄以及錄音檔嗎？（已收藏的項目將會被保留，此動作無法復原。）",
      {
        title: "清空所有紀錄",
        kind: "warning",
      },
    );
    if (!confirmed) {
      return;
    }
    try {
      const result = await commands.clearAllHistory();
      if (result.status !== "ok") {
        toast.error("清空歷史紀錄失敗：" + String(result.error));
      } else {
        setEntries((prev) => prev.filter((e) => e.saved));
        setSelectedId((prevId) => {
          if (prevId === null) return null;
          const stillSaved = entriesRef.current.some(
            (e) => e.id === prevId && e.saved,
          );
          return stillSaved ? prevId : null;
        });
        toast.success("已成功清空聽寫紀錄及錄音檔（已保留收藏項目）");
        loadStats();
      }
    } catch (error) {
      console.error("Failed to clear all history:", error);
      toast.error("清空歷史紀錄發生錯誤");
    }
  };

  const clearAllSavedHistory = async () => {
    const confirmed = await ask(
      "確定要清空所有的已收藏聽寫紀錄以及錄音檔嗎？（此動作將永久刪除且無法復原。）",
      {
        title: "清空所有收藏",
        kind: "warning",
      },
    );
    if (!confirmed) {
      return;
    }
    try {
      const result = await commands.clearAllSavedHistory();
      if (result.status !== "ok") {
        toast.error("清空收藏紀錄失敗：" + String(result.error));
      } else {
        setEntries((prev) => prev.filter((e) => !e.saved));
        setSelectedId((prevId) => {
          if (prevId === null) return null;
          const stillSaved = entriesRef.current.some(
            (e) => e.id === prevId && !e.saved,
          );
          return stillSaved ? prevId : null;
        });
        toast.success("已成功清空所有已收藏的紀錄及錄音檔");
        loadStats();
      }
    } catch (error) {
      console.error("Failed to clear all saved history:", error);
      toast.error("清空收藏紀錄發生錯誤");
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

  const handleDownloadAudio = async (fileName: string) => {
    if (!fileName) return;
    try {
      const savePath = await save({
        filters: [
          {
            name: "Audio Files",
            extensions: ["wav"],
          },
        ],
        defaultPath: fileName,
      });

      if (savePath) {
        const result = await commands.exportAudioFile(fileName, savePath);
        if (result.status === "ok") {
          toast.success("錄音檔下載成功！");
        } else {
          toast.error("下載錄音檔失敗：" + String(result.error));
        }
      }
    } catch (error) {
      console.error("Failed to download audio:", error);
      toast.error("下載錄音檔發生錯誤");
    }
  };

  return (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 select-none text-text">
      {/* 左欄：列表 */}
      <div className="flex-1 md:w-1/3 flex flex-col border border-mid-gray/20 rounded-xl bg-background-ui/5 overflow-hidden">
        <div className="p-3 border-b border-mid-gray/20 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-mid-gray uppercase tracking-wider">
              聽寫列表
            </h3>
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

          {/* 篩選分頁切換 */}
          <div className="flex gap-1.5 p-0.5 bg-mid-gray/10 rounded-lg text-[11px] font-medium shrink-0">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer text-center ${
                filter === "all"
                  ? "bg-logo-primary text-white font-semibold shadow-sm"
                  : "text-mid-gray hover:text-text"
              }`}
            >
              全部紀錄
            </button>
            <button
              onClick={() => setFilter("audio")}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer text-center ${
                filter === "audio"
                  ? "bg-logo-primary text-white font-semibold shadow-sm"
                  : "text-mid-gray hover:text-text"
              }`}
            >
              有語音檔
            </button>
            <button
              onClick={() => setFilter("saved")}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer text-center ${
                filter === "saved"
                  ? "bg-logo-primary text-white font-semibold shadow-sm"
                  : "text-mid-gray hover:text-text"
              }`}
            >
              收藏項目
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && filteredEntries.length === 0 ? (
            <div className="p-4 text-center text-xs text-mid-gray">
              載入中...
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-4 text-center text-xs text-mid-gray">
              {filter === "saved" ? "尚無已收藏的聽寫紀錄" : "尚無歷史聽寫紀錄"}
            </div>
          ) : (
            <>
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setSelectedId(entry.id)}
                  className={`p-3.5 rounded-xl text-start transition-all cursor-pointer glow-card-3d ${
                    selectedId === entry.id
                      ? "active-glow-3d scale-[1.01]"
                      : "border-2 border-mid-gray/20 hover:border-logo-primary/50 hover:bg-logo-primary/5"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px] text-mid-gray">
                    <span>
                      {formatDateTime(String(entry.timestamp), i18n.language)}
                    </span>
                    {entry.saved && (
                      <Star
                        className="w-3 h-3 text-logo-primary"
                        fill="currentColor"
                      />
                    )}
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
      <div className="flex-[2] md:w-2/3 flex flex-col border border-mid-gray/20 rounded-xl bg-background-ui/5 p-5 overflow-hidden">
        {/* 右欄標頭：包含清空選項 */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-mid-gray/20 shrink-0">
          <div className="flex items-baseline gap-3">
            <h3 className="text-xs font-semibold text-mid-gray uppercase tracking-wider">
              紀錄詳情
            </h3>
            {stats && (
              <div className="flex gap-2 select-none">
                <span
                  onClick={() => setFilter("all")}
                  className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                    filter === "all"
                      ? "bg-logo-primary text-white font-semibold shadow-sm"
                      : "bg-mid-gray/10 text-mid-gray hover:bg-logo-primary/10 hover:text-logo-primary"
                  }`}
                  title="文字歷史紀錄筆數與上限（點擊篩選全部文字紀錄）"
                >
                  文字：{stats.text_count} / {stats.text_limit} 筆
                </span>
                <span
                  onClick={() => setFilter("audio")}
                  className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                    filter === "audio"
                      ? "bg-logo-primary text-white font-semibold shadow-sm"
                      : "bg-mid-gray/10 text-mid-gray hover:bg-logo-primary/10 hover:text-logo-primary"
                  }`}
                  title="已保留錄音檔筆數與上限（點擊篩選含有錄音檔的紀錄）"
                >
                  語音：{stats.audio_count} / {stats.audio_limit} 檔
                </span>
              </div>
            )}
          </div>
          {filteredEntries.length > 0 && (
            <button
              onClick={
                filter === "saved" ? clearAllSavedHistory : clearAllHistory
              }
              className="flex items-center gap-1 text-xs text-mid-gray hover:text-red-500 transition-colors cursor-pointer"
              title={
                filter === "saved"
                  ? "清空所有已收藏紀錄與錄音檔"
                  : "清空所有歷史紀錄與錄音檔"
              }
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {filter === "saved" ? "清空所有收藏" : "清空所有紀錄"}
              </span>
            </button>
          )}
        </div>

        {/* 搜尋關鍵字輸入框 */}
        <div className="mb-4 shrink-0 relative">
          <input
            type="text"
            placeholder="搜尋歷史紀錄中的關鍵字..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs px-3 py-2 pl-9 rounded-lg border border-mid-gray/20 bg-background-ui/5 hover:border-logo-primary/30 focus:border-logo-primary focus:outline-none transition-colors text-text placeholder-mid-gray/60"
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-mid-gray/60" />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 px-2 py-1">
          {selectedEntry ? (
            <div className="space-y-6 flex flex-col h-full justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-mid-gray/20">
                  <div>
                    <h4 className="text-xs font-semibold text-mid-gray">
                      詳細時間
                    </h4>
                    <p className="text-sm font-medium">
                      {formatDateTime(
                        String(selectedEntry.timestamp),
                        i18n.language,
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          currentCopyTarget === "polished" && selectedEntry.post_processed_text
                            ? selectedEntry.post_processed_text
                            : selectedEntry.transcription_text
                        )
                      }
                      className="p-2 rounded-lg hover:bg-mid-gray/10 text-mid-gray hover:text-logo-primary transition-colors cursor-pointer"
                      title={
                        selectedEntry.post_processed_text
                          ? currentCopyTarget === "polished"
                            ? "複製選取的 AI 潤色文字"
                            : currentCopyTarget === "raw"
                              ? "複製選取的原始轉錄文字"
                              : "複製文字 (預設為原始轉錄)"
                          : "複製文字"
                      }
                    >
                      <Copy className="w-4.5 h-4.5" />
                    </button>
                    <button
                      onClick={() => toggleSaved(selectedEntry.id)}
                      className={`p-2 rounded-lg hover:bg-mid-gray/10 transition-colors cursor-pointer ${
                        selectedEntry.saved
                          ? "text-logo-primary"
                          : "text-mid-gray hover:text-logo-primary"
                      }`}
                      title={selectedEntry.saved ? "取消收藏" : "加入收藏"}
                    >
                      <Star
                        className="w-4.5 h-4.5"
                        fill={selectedEntry.saved ? "currentColor" : "none"}
                      />
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

                <div
                  className={`space-y-2 text-start ${selectedEntry.post_processed_text ? "cursor-pointer group" : ""}`}
                  onClick={() => {
                    if (selectedEntry.post_processed_text) {
                      setHistoryCopyTargets((prev) => ({
                        ...prev,
                        [selectedEntry.id]: "raw",
                      }));
                      copyToClipboard(selectedEntry.transcription_text);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-mid-gray uppercase tracking-wider">
                      原始轉錄文字 (Raw ASR)
                    </h4>
                    {selectedEntry.post_processed_text && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                        currentCopyTarget === "raw"
                          ? "bg-logo-primary text-white font-medium"
                          : "bg-mid-gray/10 text-mid-gray group-hover:bg-logo-primary/10 group-hover:text-logo-primary"
                      }`}>
                        {currentCopyTarget === "raw" ? "已選取並複製" : "點擊選取並複製"}
                      </span>
                    )}
                  </div>
                  <div className={`p-4 mx-1 rounded-xl border transition-all text-sm leading-relaxed select-text cursor-text whitespace-pre-wrap break-words min-w-0 glow-card-3d ${
                    selectedEntry.post_processed_text
                      ? currentCopyTarget === "raw"
                        ? "bg-logo-primary/5 border-logo-primary ring-1 ring-logo-primary/30"
                        : "bg-mid-gray/5 border-mid-gray/10 hover:border-logo-primary/30"
                      : "bg-mid-gray/5 border-mid-gray/10"
                  }`}>
                    {selectedEntry.transcription_text}
                  </div>
                </div>

                {selectedEntry.post_processed_text && (
                  <div
                    className="space-y-2 text-start cursor-pointer group"
                    onClick={() => {
                      setHistoryCopyTargets((prev) => ({
                        ...prev,
                        [selectedEntry.id]: "polished",
                      }));
                      copyToClipboard(selectedEntry.post_processed_text!);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-logo-primary uppercase tracking-wider">
                        AI 潤色修飾文字 (Polished Text)
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                        currentCopyTarget === "polished"
                          ? "bg-logo-primary text-white font-medium"
                          : "bg-mid-gray/10 text-mid-gray group-hover:bg-logo-primary/10 group-hover:text-logo-primary"
                      }`}>
                        {currentCopyTarget === "polished" ? "已選取並複製" : "點擊選取並複製"}
                      </span>
                    </div>
                    <div className={`p-4 mx-1 rounded-xl border transition-all text-sm leading-relaxed select-text cursor-text whitespace-pre-wrap break-words font-medium min-w-0 glow-card-3d ${
                      currentCopyTarget === "polished"
                        ? "bg-logo-primary/10 border-logo-primary ring-1 ring-logo-primary/30"
                        : "bg-logo-primary/5 border-logo-primary/10 hover:border-logo-primary/30"
                    }`}>
                      {selectedEntry.post_processed_text}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-mid-gray/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-mid-gray">語音播放</span>
                  {selectedEntry.file_name && (
                    <Button
                      onClick={() => handleDownloadAudio(selectedEntry.file_name)}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下載錄音檔</span>
                    </Button>
                  )}
                </div>
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
    </div>
  );
};
