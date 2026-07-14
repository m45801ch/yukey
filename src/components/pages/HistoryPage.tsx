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
import { Input } from "../ui/Input";
import { addCorrectionRule } from "@/utils/correctionRules";
import { useSettings } from "@/hooks/useSettings";

const formatCopyText = (text: string, format: "plain" | "markdown"): string => {
  if (format === "markdown") {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    return `**${dateStr} ${timeStr}**\n\n${text}`;
  }
  return text;
};

const PAGE_SIZE = 30;

export const HistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const osType = useOsType();
  const { copyFormat } = useSettings();

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [historyCopyTargets, setHistoryCopyTargets] = useState<Record<number, "raw" | "polished">>({});
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [filter, setFilter] = useState<"all" | "saved" | "audio">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [popover, setPopover] = useState<{
    x: number;
    y: number;
    selectedText: string;
  } | null>(null);
  const [correctionPattern, setCorrectionPattern] = useState("");
  const [correctionInput, setCorrectionInput] = useState("");

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
      await navigator.clipboard.writeText(formatCopyText(text, copyFormat));
      toast.success(t("settings.history.copied"));
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
        toast.success(t("pages.history.toastDeleteSuccess"));
        loadStats();
      }
    } catch (error) {
      console.error("Failed to delete entry:", error);
      loadPage();
    }
  };

  const clearAllHistory = async () => {
    const confirmed = await ask(
      t("pages.history.toastClearConfirm"),
      {
        title: t("pages.history.toastClearTitle"),
        kind: "warning",
      },
    );
    if (!confirmed) {
      return;
    }
    try {
      const result = await commands.clearAllHistory();
      if (result.status !== "ok") {
        toast.error(t("pages.history.toastClearError", { error: String(result.error) }));
      } else {
        setEntries((prev) => prev.filter((e) => e.saved));
        setSelectedId((prevId) => {
          if (prevId === null) return null;
          const stillSaved = entriesRef.current.some(
            (e) => e.id === prevId && e.saved,
          );
          return stillSaved ? prevId : null;
        });
        toast.success(t("pages.history.toastClearSuccess"));
        loadStats();
      }
    } catch (error) {
      console.error("Failed to clear all history:", error);
      toast.error(t("pages.history.toastClearGenericError"));
    }
  };

  const clearAllSavedHistory = async () => {
    const confirmed = await ask(
      t("pages.history.toastClearSavedConfirm"),
      {
        title: t("pages.history.toastClearSavedTitle"),
        kind: "warning",
      },
    );
    if (!confirmed) {
      return;
    }
    try {
      const result = await commands.clearAllSavedHistory();
      if (result.status !== "ok") {
        toast.error(t("pages.history.toastClearSavedError", { error: String(result.error) }));
      } else {
        setEntries((prev) => prev.filter((e) => !e.saved));
        setSelectedId((prevId) => {
          if (prevId === null) return null;
          const stillSaved = entriesRef.current.some(
            (e) => e.id === prevId && !e.saved,
          );
          return stillSaved ? prevId : null;
        });
        toast.success(t("pages.history.toastClearSavedSuccess"));
        loadStats();
      }
    } catch (error) {
      console.error("Failed to clear all saved history:", error);
      toast.error(t("pages.history.toastClearSavedGenericError"));
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
          toast.success(t("pages.history.toastDownloadSuccess"));
        } else {
          toast.error(t("pages.history.toastDownloadError", { error: String(result.error) }));
        }
      }
    } catch (error) {
      console.error("Failed to download audio:", error);
      toast.error(t("pages.history.toastDownloadGenericError"));
    }
  };

  const handleRawTextMouseUp = useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;

      const text = selection.toString().trim();
      if (!text) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setPopover({
        x: rect.left + rect.width / 2,
        y: rect.bottom + window.scrollY + 4,
        selectedText: text,
      });
      setCorrectionPattern(text);
      setCorrectionInput("");
    }, 10);
  }, []);

  const handleCorrectionConfirm = useCallback(() => {
    const pattern = correctionPattern.trim();
    const correction = correctionInput.trim();
    if (!pattern || !correction || !popover || !selectedEntry) return;

    setEntries((prev) =>
      prev.map((e) =>
        e.id === selectedEntry.id
          ? {
              ...e,
              transcription_text: e.transcription_text.replace(
                pattern,
                correction,
              ),
            }
          : e,
      ),
    );

    const customWords: string[] = JSON.parse(
      localStorage.getItem("openless_prompt_plugin_settings") || "{}",
    ).custom_words || [];

    addCorrectionRule(pattern, correction, customWords);

    toast.success(t("pages.history.correctionAdded"));

    setPopover(null);
    setCorrectionPattern("");
    setCorrectionInput("");
  }, [correctionPattern, correctionInput, popover, selectedEntry, t]);

  const handleCorrectionCancel = useCallback(() => {
    setPopover(null);
    setCorrectionPattern("");
    setCorrectionInput("");
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && popover) {
        setPopover(null);
        setCorrectionPattern("");
        setCorrectionInput("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popover]);

  return (
    <div className="w-full h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 select-none text-text">
      {/* 左欄：列表 */}
      <div className="flex-1 md:w-1/3 flex flex-col border border-mid-gray/20 rounded-xl bg-background-ui/5 overflow-hidden">
        <div className="p-3 border-b border-mid-gray/20 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-mid-gray uppercase tracking-wider">
              {t("pages.history.entryList")}
            </h3>
            <Button
              onClick={openRecordingsFolder}
              variant="secondary"
              size="sm"
              className="flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{t("pages.history.openFolder")}</span>
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
              {t("pages.history.filterAll")}
            </button>
            <button
              onClick={() => setFilter("audio")}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer text-center ${
                filter === "audio"
                  ? "bg-logo-primary text-white font-semibold shadow-sm"
                  : "text-mid-gray hover:text-text"
              }`}
            >
              {t("pages.history.filterAudio")}
            </button>
            <button
              onClick={() => setFilter("saved")}
              className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer text-center ${
                filter === "saved"
                  ? "bg-logo-primary text-white font-semibold shadow-sm"
                  : "text-mid-gray hover:text-text"
              }`}
            >
              {t("pages.history.filterSaved")}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading && filteredEntries.length === 0 ? (
            <div className="p-4 text-center text-xs text-mid-gray">
              {t("pages.history.loading")}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-4 text-center text-xs text-mid-gray">
              {t(filter === "saved" ? "pages.history.emptySaved" : "pages.history.emptyAll")}
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
              {t("pages.history.detailTitle")}
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
                  title={t("pages.history.statsTextTooltip")}
                >
                  {t("pages.history.statsText", { count: stats.text_count, limit: stats.text_limit })}
                </span>
                <span
                  onClick={() => setFilter("audio")}
                  className={`text-[10px] px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                    filter === "audio"
                      ? "bg-logo-primary text-white font-semibold shadow-sm"
                      : "bg-mid-gray/10 text-mid-gray hover:bg-logo-primary/10 hover:text-logo-primary"
                  }`}
                  title={t("pages.history.statsAudioTooltip")}
                >
                  {t("pages.history.statsAudio", { count: stats.audio_count, limit: stats.audio_limit })}
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
              title={t(filter === "saved" ? "pages.history.clearSavedTooltip" : "pages.history.clearAllTooltip")}
            >
              <Trash2 className="w-4 h-4" />
              <span>
                {t(filter === "saved" ? "pages.history.clearSaved" : "pages.history.clearAll")}
              </span>
            </button>
          )}
        </div>

        {/* 搜尋關鍵字輸入框 */}
        <div className="mb-4 shrink-0 relative">
          <input
            type="text"
            placeholder={t("pages.history.searchPlaceholder")}
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
                      {t("pages.history.timestamp")}
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
                            ? t("pages.history.copyTooltipPolished")
                            : currentCopyTarget === "raw"
                              ? t("pages.history.copyTooltipRaw")
                              : t("pages.history.copyTooltipDefault")
                          : t("pages.history.copyTooltip")
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
                      title={t(selectedEntry.saved ? "pages.history.toggleUnsave" : "pages.history.toggleSave")}
                    >
                      <Star
                        className="w-4.5 h-4.5"
                        fill={selectedEntry.saved ? "currentColor" : "none"}
                      />
                    </button>
                    <button
                      onClick={() => deleteEntry(selectedEntry.id)}
                      className="p-2 rounded-lg hover:bg-mid-gray/10 text-mid-gray hover:text-red-500 transition-colors cursor-pointer"
                      title={t("pages.history.delete")}
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
                      {t("pages.history.rawText")}
                    </h4>
                    {selectedEntry.post_processed_text && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                        currentCopyTarget === "raw"
                          ? "bg-logo-primary text-white font-medium"
                          : "bg-mid-gray/10 text-mid-gray group-hover:bg-logo-primary/10 group-hover:text-logo-primary"
                      }`}>
                        {t(currentCopyTarget === "raw" ? "pages.history.selectedAndCopied" : "pages.history.clickToSelect")}
                      </span>
                    )}
                  </div>
                  <div className={`p-4 mx-1 rounded-xl border transition-all text-sm leading-relaxed select-text cursor-text whitespace-pre-wrap break-words min-w-0 glow-card-3d ${
                    selectedEntry.post_processed_text
                      ? currentCopyTarget === "raw"
                        ? "bg-logo-primary/5 border-logo-primary ring-1 ring-logo-primary/30"
                        : "bg-mid-gray/5 border-mid-gray/10 hover:border-logo-primary/30"
                      : "bg-mid-gray/5 border-mid-gray/10"
                  }`}
                  onMouseUp={handleRawTextMouseUp}>
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
                        {t("pages.history.polishedText")}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                        currentCopyTarget === "polished"
                          ? "bg-logo-primary text-white font-medium"
                          : "bg-mid-gray/10 text-mid-gray group-hover:bg-logo-primary/10 group-hover:text-logo-primary"
                      }`}>
                        {t(currentCopyTarget === "polished" ? "pages.history.selectedAndCopied" : "pages.history.clickToSelect")}
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
                  <span className="text-xs font-semibold text-mid-gray">{t("pages.history.audioPlayback")}</span>
                  {selectedEntry.file_name && (
                    <Button
                      onClick={() => handleDownloadAudio(selectedEntry.file_name)}
                      variant="secondary"
                      size="sm"
                      className="flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{t("pages.history.downloadAudio")}</span>
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
              <p className="text-sm">{t("pages.history.noSelection")}</p>
            </div>
          )}

          {popover && (
            <>
              <div
                className="fixed inset-0 z-[200]"
                onClick={handleCorrectionCancel}
              />
              <div
                className="fixed z-[201] bg-background border border-mid-gray/20 rounded-xl shadow-2xl p-4 space-y-3 w-[32rem]"
                style={{
                  left: Math.max(
                    8,
                    Math.min(popover.x - 256, window.innerWidth - 520),
                  ),
                  top: popover.y,
                }}
              >
                <p className="text-xs font-semibold text-mid-gray">
                  {t("pages.history.correctionHint")}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={correctionPattern}
                    onChange={(e) => setCorrectionPattern(e.target.value)}
                    placeholder={t("pages.history.correctionPatternPlaceholder")}
                    variant="compact"
                    className="w-1/3"
                  />
                  <span className="text-xs text-mid-gray shrink-0">&rarr;</span>
                  <Input
                    type="text"
                    value={correctionInput}
                    onChange={(e) => setCorrectionInput(e.target.value)}
                    placeholder={t("pages.history.correctionPlaceholder")}
                    variant="compact"
                    className="w-1/3"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCorrectionConfirm();
                    }}
                    autoFocus
                  />
                  <Button
                    onClick={handleCorrectionConfirm}
                    disabled={!correctionPattern.trim() || !correctionInput.trim()}
                    variant="primary"
                    size="md"
                    className="whitespace-nowrap shrink-0"
                  >
                    {t("pages.history.correctionConfirm")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
