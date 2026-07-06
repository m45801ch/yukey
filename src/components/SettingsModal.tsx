import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Cog, Cpu, Sliders, Sparkles, HelpCircle } from "lucide-react";
import {
  GeneralSettings,
  ModelsSettings,
  AdvancedSettings,
  PostProcessingSettings,
  DebugSettings,
  AboutSettings,
} from "./settings";
import { useSettings } from "@/hooks/useSettings";

type SettingsSection =
  | "general"
  | "models"
  | "advanced"
  | "services"
  | "debug"
  | "about";

interface SettingsModalProps {
  onClose: () => void;
  defaultTab?: SettingsSection;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  defaultTab,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsSection>(
    defaultTab || "general",
  );

  const SECTIONS = [
    { id: "general", label: t("sidebar.general"), icon: Cog, component: GeneralSettings },
    { id: "models", label: t("sidebar.models"), icon: Cpu, component: ModelsSettings },
    {
      id: "advanced",
      label: t("sidebar.advanced"),
      icon: Sliders,
      component: AdvancedSettings,
    },
    {
      id: "services",
      label: t("sidebar.postProcessing"),
      icon: Sparkles,
      component: PostProcessingSettings,
    },
    {
      id: "debug",
      label: t("sidebar.debug"),
      icon: HelpCircle,
      component: DebugSettings,
      enabled: settings?.debug_mode ?? false,
    },
    {
      id: "about",
      label: t("sidebar.about"),
      icon: HelpCircle,
      component: AboutSettings,
    },
  ] as const;

  const activeSection = SECTIONS.find((s) => s.id === activeTab) || SECTIONS[0];
  const ActiveComponent = activeSection.component;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in select-none text-text">
      <div className="w-full max-w-6xl h-[92vh] bg-background border border-mid-gray/20 rounded-2xl flex overflow-hidden shadow-2xl relative">
        {/* 左側：設定專屬的 Sidebar */}
        <div className="w-56 bg-mid-gray/5 border-r border-mid-gray/20 flex flex-col justify-between p-4">
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-mid-gray px-2 uppercase tracking-wider">
              {t("sidebar.center")}
            </h3>
            <div className="space-y-1">
              {SECTIONS.map((sec) => {
                // 如果是偵錯分頁，檢查是否啟用
                if ("enabled" in sec && !sec.enabled) return null;
                const Icon = sec.icon;
                const active = activeTab === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => setActiveTab(sec.id as SettingsSection)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-start transition-all cursor-pointer ${
                      active
                        ? "active-settings-item-3d"
                        : "hover:bg-mid-gray/10 text-text/80 hover:text-text"
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    <span>{sec.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-[10px] text-mid-gray px-2">
            yukey settings &copy; 2026
          </div>
        </div>

        {/* 右側：主設定面板 */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* 頂部控制欄 */}
          <div className="flex justify-between items-center p-4 border-b border-mid-gray/20">
            <h2 className="text-sm font-bold text-text">
              {activeSection.label}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-mid-gray/10 text-mid-gray hover:text-text transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 設定內容捲動區 */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 pb-32 bg-background">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
};
