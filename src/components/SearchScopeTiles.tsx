"use client";

import type { Child } from "@/lib/types";
import { SCOPE_FILTER_PRESETS } from "@/lib/scopeOptions";

interface SearchScopeTilesProps {
  value: string;
  onChange: (key: string) => void;
  childProfiles: Child[];
  selectedChildIds: string[];
}

function Tile({
  selected,
  onClick,
  icon,
  label,
  hint,
  selectedClassName,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  hint?: string;
  selectedClassName?: string;
}) {
  const customSelected = selected && !!selectedClassName;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`search-scope-tile flex flex-col items-center justify-center gap-0.5 p-2 rounded-xl border-2 transition active:scale-[0.98] ${
        selected
          ? selectedClassName ?? "border-teal-500 bg-teal-50 shadow-sm ring-1 ring-teal-200"
          : "border-slate-100 bg-white hover:border-slate-200"
      }`}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {icon}
      </span>
      <span
        className={`text-[11px] font-bold leading-tight ${
          selected ? (customSelected ? "text-white" : "text-teal-800") : "text-slate-700"
        }`}
      >
        {label}
      </span>
      {hint && (
        <span
          className={`text-[9px] leading-tight ${
            selected ? (customSelected ? "text-white/90" : "text-teal-600") : "text-slate-400"
          }`}
        >
          {hint}
        </span>
      )}
    </button>
  );
}

export function SearchScopeTiles({
  value,
  onChange,
  childProfiles,
  selectedChildIds,
}: SearchScopeTilesProps) {
  const childTiles = childProfiles.filter((c) => selectedChildIds.includes(c.id));

  return (
    <div className="px-3 py-2.5 border-b border-slate-100 flex-shrink-0 bg-slate-50/50">
      <p className="text-[10px] font-bold text-slate-400 mb-2">ジャンルで絞り込み（タップで表示）</p>
      <div className="grid grid-cols-3 gap-2">
        {SCOPE_FILTER_PRESETS.map(({ key, label, icon, hint }) => (
          <Tile
            key={key}
            selected={value === key}
            onClick={() => onChange(key)}
            icon={icon}
            label={label}
            hint={hint}
          />
        ))}
        {childTiles.map((child) => (
          <Tile
            key={child.id}
            selected={value === child.id}
            onClick={() => onChange(child.id)}
            icon={child.avatar}
            label={child.name.split(" ")[0]}
            hint="お子さま"
            selectedClassName={`border-transparent shadow-sm ${child.color}`}
          />
        ))}
      </div>
    </div>
  );
}
