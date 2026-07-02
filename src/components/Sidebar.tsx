import React from "react";
import {
  LayoutDashboard,
  History,
  BookOpen,
  Sparkles,
  Cog,
} from "lucide-react";
import { Overview } from "./pages/Overview";
import { HistoryPage } from "./pages/HistoryPage";
import { VocabPage } from "./pages/VocabPage";
import { StylePage } from "./pages/StylePage";

import yukeyStartImg from "../assets/yukey-start.png";

export type SidebarSection = "overview" | "history" | "vocab" | "style";

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
  onOpenSettings,
}) => {
  const SECTIONS = [
    { id: "overview", label: "概覽", icon: LayoutDashboard },
    { id: "history", label: "歷史紀錄", icon: History },
    { id: "vocab", label: "詞彙字典", icon: BookOpen },
    { id: "style", label: "修飾風格", icon: Sparkles },
  ] as const;

  return (
    <div className="flex flex-col w-44 h-full border-e border-mid-gray/20 bg-background-ui/5 items-center justify-between px-2 py-4 select-none">
      {/* 頂部 Logo 替換為 yukey-start 圖片 */}
      <div className="w-full text-center py-2 flex flex-col items-center justify-center">
        <img
          src={yukeyStartImg}
          alt="yukey"
          className="h-[40px] object-contain my-1"
        />
      </div>

      {/* 中間分頁導覽清單 */}
      <div className="flex flex-col w-full items-center gap-1.5 flex-1 pt-6">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id as SidebarSection)}
              className={`flex gap-3 items-center px-3 py-2.5 w-full rounded-xl cursor-pointer transition-all text-start ${
                isActive
                  ? "active-sidebar-item-3d text-white font-bold"
                  : "hover:bg-mid-gray/10 text-text/80 hover:text-text"
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-bold">{section.label}</span>
            </button>
          );
        })}
      </div>

      {/* 左下角小齒輪設定按鈕 */}
      <div className="w-full pt-4 border-t border-mid-gray/20">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-mid-gray/10 text-text/80 hover:text-text transition-colors text-start cursor-pointer font-bold"
        >
          <Cog className="w-5 h-5 shrink-0" />
          <span className="text-sm">設定</span>
        </button>
      </div>
    </div>
  );
};
