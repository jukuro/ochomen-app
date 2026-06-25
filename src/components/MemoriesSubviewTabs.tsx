"use client";

import type { MemorySubview } from "@/lib/types";

interface MemoriesSubviewTabsProps {
  value: MemorySubview;
  onChange: (value: MemorySubview) => void;
}

export function MemoriesSubviewTabs({ value, onChange }: MemoriesSubviewTabsProps) {
  const tabs: { id: MemorySubview; label: string }[] = [
    { id: "timeline", label: "📅 年表" },
    { id: "diary", label: "🌸 日記" },
    { id: "art", label: "🎨 お絵描き" },
    { id: "ochomen", label: "📒 お帳面" },
  ];

  return (
    <div className="app-context-segment app-context-segment-compact mx-3 mt-2 mb-1 flex-shrink-0 overflow-x-auto">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`app-context-segment-btn ${value === id ? "app-context-segment-btn-active" : "text-slate-400"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
