"use client";

import type { ChildCharacter } from "@/lib/childCharacters";
import {
  childXpProgress,
  getCharacterDisplayEmoji,
  getCharacterStageLabel,
} from "@/lib/childCharacters";
import type { MascotAnim } from "@/components/MascotCharacter";

interface ChildCharacterCardProps {
  childName: string;
  character?: ChildCharacter;
  anim?: MascotAnim;
  compact?: boolean;
  onSetup: () => void;
}

export function ChildCharacterCard({
  childName,
  character,
  anim = "idle",
  compact = false,
  onSetup,
}: ChildCharacterCardProps) {
  if (!character) {
    return (
      <button
        type="button"
        onClick={onSetup}
        className="w-full flex items-center gap-3 p-3 rounded-xl border border-dashed text-left active:scale-[0.99] transition"
        style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-light)" }}
      >
        <span className="text-2xl">✨</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            {childName}のキャラを育てる
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
            写真からAIキャラを作成。スキャンで成長します
          </p>
        </div>
      </button>
    );
  }

  const emoji = getCharacterDisplayEmoji(character);
  const { current, required, level } = childXpProgress(character);
  const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0;
  const animClass =
    anim === "eat" ? "mascot-eat" : anim === "levelUp" ? "mascot-level-up" : "mascot-idle";

  return (
    <div
      className={`rounded-xl border p-3 ${compact ? "" : "space-y-2"}`}
      style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className={`${compact ? "w-12 h-12 text-2xl" : "w-14 h-14 text-3xl"} ${animClass} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm`}
          style={{ background: "var(--color-surface)" }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold truncate" style={{ color: "var(--color-text)" }}>
              {character.characterName}
            </p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--color-accent-light)", color: "var(--color-text)" }}
            >
              {getCharacterStageLabel(character)}
            </span>
            <span className="text-[10px] font-bold" style={{ color: "var(--color-muted)" }}>
              Lv.{level}
            </span>
          </div>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--color-muted)" }}>
            {childName} · {character.tagline}
          </p>
          {!compact && (
            <div className="mt-1.5">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: "var(--color-secondary)" }}
                />
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onSetup}
          className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
          style={{ background: "var(--color-surface)", color: "var(--color-primary)" }}
        >
          変更
        </button>
      </div>
    </div>
  );
}
