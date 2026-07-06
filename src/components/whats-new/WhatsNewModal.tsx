import React, { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Dialog } from "../ui";
import type { ReleaseNote } from "./releaseNotes";

const MarkdownContent = React.lazy(
  () => import("./MarkdownContent").then((m) => ({ default: m.MarkdownContent })),
);

interface WhatsNewModalProps {
  note: ReleaseNote;
  open: boolean;
  onDismiss: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({
  note,
  open,
  onDismiss,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog
      open={open}
      title={t("whatsNew.title", { version: note.version })}
      closeLabel={t("common.close")}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onDismiss();
      }}
    >
      <Suspense
        fallback={
          <div className="h-32 w-full animate-pulse rounded-md bg-mid-gray/10" />
        }
      >
        <MarkdownContent markdown={note.markdown} />
      </Suspense>
    </Dialog>
  );
};
