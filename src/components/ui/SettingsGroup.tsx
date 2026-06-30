import React from "react";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-2">
      {title && (
        <div className="px-4">
          <h2 className="text-xs font-medium text-mid-gray uppercase tracking-wide">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-mid-gray mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="bg-background-ui border border-mid-gray/15 rounded-lg overflow-visible relative hover:z-20 focus-within:z-20 transition-all duration-150 glow-card-3d">
        <div className="divide-y divide-mid-gray/10">{children}</div>
      </div>
    </div>
  );
};
