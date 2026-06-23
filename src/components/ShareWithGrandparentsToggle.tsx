"use client";

interface ShareWithGrandparentsToggleProps {
  shared: boolean;
  onToggle: () => void;
  compact?: boolean;
}

export function ShareWithGrandparentsToggle({
  shared,
  onToggle,
  compact = false,
}: ShareWithGrandparentsToggleProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`rounded-full font-bold border transition active:scale-[0.98] ${
        compact ? "text-[9px] px-2 py-1" : "text-[10px] px-2.5 py-1.5"
      } ${
        shared
          ? "bg-orange-100 text-orange-800 border-orange-200"
          : "bg-slate-50 text-slate-500 border-slate-200"
      }`}
      aria-pressed={shared}
    >
      👴👵 {shared ? "祖父母に共有中" : "祖父母に共有しない"}
    </button>
  );
}
