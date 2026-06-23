"use client";

import {
  DEFAULT_CHARACTER,
  getCharacterEmoji,
  xpProgressInLevel,
  type UserProgress,
} from "@/lib/userProgress";
import {
  childXpProgress,
  getCharacterDisplayEmoji,
  getCharacterStageLabel,
  type ChildCharacter,
} from "@/lib/childCharacters";

export type MascotAnim = "idle" | "eat" | "levelUp";

interface MascotCharacterProps {
  progress: UserProgress;
  /** 指定時はぴぃちゃんの代わりにお子さまキャラを表示 */
  childCharacter?: ChildCharacter;
  size?: "sm" | "md" | "lg";
  anim?: MascotAnim;
  showBar?: boolean;
  showMessage?: boolean;
}

export function MascotCharacter({
  progress,
  childCharacter,
  size = "md",
  anim = "idle",
  showBar = true,
  showMessage = false,
}: MascotCharacterProps) {
  const useChild = !!childCharacter;
  const emoji = useChild
    ? getCharacterDisplayEmoji(childCharacter)
    : getCharacterEmoji(progress.level);

  const { current, required, level } = useChild
    ? childXpProgress(childCharacter)
    : xpProgressInLevel(progress.xp);

  const pct = required > 0 ? Math.min(100, Math.round((current / required) * 100)) : 0;
  const displayName = useChild ? childCharacter.characterName : DEFAULT_CHARACTER.name;
  const tagline = useChild ? childCharacter.tagline : DEFAULT_CHARACTER.tagline;
  const stageBadge = useChild ? getCharacterStageLabel(childCharacter) : null;

  const boxClass =
    size === "lg" ? "w-20 h-20 text-4xl" :
    size === "sm" ? "w-11 h-11 text-xl" :
    "w-16 h-16 text-3xl";

  const animClass =
    anim === "eat" ? "mascot-eat" :
    anim === "levelUp" ? "mascot-level-up" :
    "mascot-idle";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${boxClass} ${animClass} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm`}
        style={{ background: "var(--color-primary-light)" }}
        aria-hidden
      >
        {emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            {displayName}
          </span>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: "var(--color-accent-light)", color: "var(--color-text)" }}
          >
            {stageBadge ?? `Lv.${level}`}
          </span>
        </div>
        {showBar && (
          <div className="mt-1.5">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: "var(--color-secondary)" }}
              />
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
              次の成長まで {required - current} XP
            </p>
          </div>
        )}
        {showMessage && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "var(--color-muted)" }}>
            {tagline}
          </p>
        )}
      </div>
    </div>
  );
}
