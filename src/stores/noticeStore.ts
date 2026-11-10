import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { NOTICE_EVENTS, noticeFromEvent, type Notice } from "@/lib/notices";

const MAX_NOTICES = 20;

interface NoticeStore {
  notices: Notice[];
  panelOpen: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  push: (notice: Notice) => void;
  setPanelOpen: (open: boolean) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export const useNoticeStore = create<NoticeStore>()((set, get) => ({
  notices: [],
  panelOpen: false,
  initialized: false,

  initialize: async () => {
    if (get().initialized) return;
    set({ initialized: true });

    for (const event of NOTICE_EVENTS) {
      try {
        await listen(event, (payload) => {
          const notice = noticeFromEvent(event, payload.payload);
          if (notice) get().push(notice);
        });
      } catch (error) {
        // The Vite dev server can run without the Tauri runtime; the app still
        // works, notices just won't be raised until it runs inside Tauri.
        console.warn(`[notices] cannot subscribe to "${event}"`, error);
      }
    }
  },

  push: (notice) =>
    set((state) => ({
      notices: [
        notice,
        ...state.notices.filter((item) => item.code !== notice.code),
      ].slice(0, MAX_NOTICES),
    })),

  setPanelOpen: (panelOpen) => set({ panelOpen }),

  dismiss: (id) =>
    set((state) => ({
      notices: state.notices.filter((notice) => notice.id !== id),
    })),

  dismissAll: () => set({ notices: [], panelOpen: false }),
}));
