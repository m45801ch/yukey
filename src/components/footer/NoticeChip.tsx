import { useTranslation } from "react-i18next";
import { useNoticeStore } from "@/stores/noticeStore";
import NoticeBadgeIcon from "../icons/NoticeBadgeIcon";

/** Footer chip: a persistent count of background failures. */
const NoticeChip: React.FC = () => {
  const { t } = useTranslation();
  const notices = useNoticeStore((state) => state.notices);
  const panelOpen = useNoticeStore((state) => state.panelOpen);
  const setPanelOpen = useNoticeStore((state) => state.setPanelOpen);

  if (notices.length === 0) return null;

  const errors = notices.filter((notice) => notice.level === "error").length;
  const warnings = notices.length - errors;

  return (
    <button
      type="button"
      onClick={() => setPanelOpen(!panelOpen)}
      title={t("notices.title")}
      aria-label={t("notices.title")}
      className={`flex items-center gap-1.5 rounded px-2 py-1 transition-colors ${
        errors > 0
          ? "text-red-500 hover:bg-red-500/10"
          : "text-amber-500 hover:bg-amber-500/10"
      } ${panelOpen ? "bg-mid-gray/20" : ""}`}
    >
      <NoticeBadgeIcon />
      {errors > 0 && (
        <span>
          {t(errors === 1 ? "notices.errorOne" : "notices.errorMany", {
            n: errors,
          })}
        </span>
      )}
      {warnings > 0 && (
        <span>
          {t(warnings === 1 ? "notices.warningOne" : "notices.warningMany", {
            n: warnings,
          })}
        </span>
      )}
    </button>
  );
};

export default NoticeChip;
