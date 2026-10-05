"use client";

import { type ReactNode, useState } from "react";

type TabId = "features" | "travel" | "expenses" | "departments" | "roles";

const tabs: { id: TabId; label: string }[] = [
  { id: "features", label: "Features" },
  { id: "travel", label: "Travel" },
  { id: "expenses", label: "Expense - categories" },
  { id: "departments", label: "Departments" },
  { id: "roles", label: "Roles" },
];

type SettingsTabsProps = {
  features: ReactNode;
  travel: ReactNode;
  expenses: ReactNode;
  departments: ReactNode;
  roles: ReactNode;
};

export function SettingsTabs({
  features,
  travel,
  expenses,
  departments,
  roles,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("features");
  const panels: Record<TabId, ReactNode> = {
    features,
    travel,
    expenses,
    departments,
    roles,
  };

  return (
    <div>
      <div role="tablist" className="mb-6 flex gap-2 border-b border-slate-200">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`settings-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-violet-600 text-violet-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`settings-panel-${tab.id}`}
          aria-labelledby={`settings-tab-${tab.id}`}
          hidden={tab.id !== activeTab}
        >
          {tab.id === activeTab && panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
