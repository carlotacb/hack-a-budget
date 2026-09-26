"use client";

import { type ReactNode, useState } from "react";

type TabId = "travel" | "expenses" | "departments";

const tabs: { id: TabId; label: string }[] = [
  { id: "travel", label: "Travel" },
  { id: "expenses", label: "Expense - categories" },
  { id: "departments", label: "Departments" },
];

type MetadataTabsProps = {
  travel: ReactNode;
  expenses: ReactNode;
  departments: ReactNode;
};

export function MetadataTabs({
  travel,
  expenses,
  departments,
}: MetadataTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("travel");
  const panels: Record<TabId, ReactNode> = { travel, expenses, departments };

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
              id={`metadata-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`metadata-panel-${tab.id}`}
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
          id={`metadata-panel-${tab.id}`}
          aria-labelledby={`metadata-tab-${tab.id}`}
          hidden={tab.id !== activeTab}
        >
          {tab.id === activeTab && panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
