import { useTranslation } from "react-i18next";
import { useNoticeStore } from "@/stores/noticeStore";

/** Panel listing persisted background failures, opened from the footer chip. */
const NoticePanel: React.FC = () => {
  const { t } = useTranslation();
  const notices = useNoticeStore((state) => state.notices);
  const panelOpen = useNoticeStore((state) => state.panelOpen);
  const setPanelOpen = useNoticeStore((state) => state.setPanelOpen);
  const dismiss = useNoticeStore((state) => state.dismiss);
  const dismissAll = useNoticeStore((state) => state.dismissAll);

  if (!panelOpen) return null;

  return (
    <div className="fixed bottom-12 right-4 z-50 w-80 max-h-96 flex flex-col overflow-hidden rounded-lg border border-mid-gray/40 bg-background shadow-xl">
      <div className="flex items-center justify-between border-b border-mid-gray/20 px-3 py-2">
        <span className="text-sm font-semibold text-text">
          {t("notices.title")}
        </span>
        <div className="flex items-center gap-2">
          {notices.length > 0 && (
            <button
              type="button"
              onClick={dismissAll}
              className="text-xs text-text/60 hover:text-text"
            >
              {t("notices.dismissAll")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            aria-label={t("common.close")}
            className="text-text/60 hover:text-text"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {notices.length === 0 ? (
          <p className="px-3 py-4 text-sm text-text/50">{t("notices.empty")}</p>
        ) : (
          <ul className="divide-y divide-mid-gray/20">
            {notices.map((notice) => (
              <li key={notice.id} className="px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        notice.level === "error"
                          ? "text-red-500"
                          : "text-amber-500"
                      }`}
                    >
                      {t(notice.titleKey)}
                    </p>
                    {(notice.bodyKey || notice.detail) && (
                      <p className="mt-1 break-words text-xs text-text/60">
                        {notice.bodyKey
                          ? t(notice.bodyKey, { error: notice.detail ?? "" })
                          : notice.detail}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(notice.id)}
                    className="shrink-0 text-xs text-text/50 hover:text-text"
                  >
                    {t("notices.dismiss")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NoticePanel;
