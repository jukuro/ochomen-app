"use client";

import { ChevronRight, Pencil } from "lucide-react";
import type { Artwork, Child, Diary } from "@/lib/types";
import { childProfileStats, formatChildAge, grandparentsShareStats, type LatestMemory } from "@/lib/childProfile";
import { getChildCharacter } from "@/lib/childCharacters";
import type { UserProgress } from "@/lib/userProgress";

interface ChildGrowthProfileCardProps {
  child: Child;
  diaries: Diary[];
  artworks: Artwork[];
  userProgress: UserProgress;
  onEdit: () => void;
  onViewRecentMemory: (memory: LatestMemory) => void;
}

export function ChildGrowthProfileCard({
  child,
  diaries,
  artworks,
  userProgress,
  onEdit,
  onViewRecentMemory,
}: ChildGrowthProfileCardProps) {
  const stats = childProfileStats(child.id, diaries, artworks);
  const shareStats = grandparentsShareStats(child.id, diaries, artworks);
  const age = child.birthDate ? formatChildAge(child.birthDate) : null;
  const character = getChildCharacter(userProgress, child.id);
  const firstName = child.name.split(" ")[0];
  const memory = stats.latestMemory;

  return (
    <div
      className="rounded-2xl border p-4 space-y-3"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-sm"
          style={{ background: "var(--color-bg)" }}
        >
          {child.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-bold truncate" style={{ color: "var(--color-text)" }}>
              {firstName}
            </p>
            {age && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "var(--color-secondary-light)", color: "var(--color-secondary)" }}
              >
                {age}
              </span>
            )}
            {shareStats.total > 0 && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: "#fff7ed", color: "#ea580c" }}
              >
                👴👵 共有 {shareStats.total}件
              </span>
            )}
          </div>
          {child.profileNote ? (
            <p className="text-[11px] mt-1 leading-relaxed line-clamp-2" style={{ color: "var(--color-muted)" }}>
              {child.profileNote}
            </p>
          ) : (
            <p className="text-[10px] mt-1" style={{ color: "var(--color-muted)" }}>
              生年月日や好きなことを登録できます
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`${firstName}のプロフィールを編集`}
          className="p-2 rounded-xl border flex-shrink-0 active:scale-95 transition"
          style={{ borderColor: "var(--color-border)", color: "var(--color-muted)" }}
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>
            {stats.diaryCount}
          </p>
          <p className="text-[9px]" style={{ color: "var(--color-muted)" }}>
            日記
          </p>
        </div>
        <div className="rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--color-accent)" }}>
            {stats.artworkCount}
          </p>
          <p className="text-[9px]" style={{ color: "var(--color-muted)" }}>
            お絵描き
          </p>
        </div>
        <div className="rounded-xl py-2" style={{ background: "var(--color-bg)" }}>
          <p className="text-sm font-bold" style={{ color: "var(--color-secondary)" }}>
            {character ? `Lv.${character.level}` : "—"}
          </p>
          <p className="text-[9px]" style={{ color: "var(--color-muted)" }}>
            キャラ
          </p>
        </div>
      </div>

      {memory && (
        <button
          type="button"
          onClick={() => onViewRecentMemory(memory)}
          className="w-full flex items-center gap-3 p-3 rounded-xl border text-left active:scale-[0.99] transition"
          style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
        >
          {memory.type === "art" && memory.previewUrl ? (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={memory.previewUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <span className="text-2xl flex-shrink-0">{memory.type === "art" ? "🎨" : "🌸"}</span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold" style={{ color: "var(--color-muted)" }}>
              最近の思い出 · {memory.type === "art" ? "お絵描き" : "日記"}を見る
            </p>
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text)" }}>
              {memory.label}
            </p>
          </div>
          <ChevronRight size={16} style={{ color: "var(--color-muted)" }} />
        </button>
      )}
    </div>
  );
}
