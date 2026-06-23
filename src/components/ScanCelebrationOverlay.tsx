"use client";

import { useEffect } from "react";
import { DEFAULT_CHARACTER, getCharacterEmoji, reassuranceMessage } from "@/lib/userProgress";
import { getCharacterDisplayEmoji, type ChildCharacter } from "@/lib/childCharacters";
import { pickCelebrationMessage, CELEBRATION_MESSAGES, triggerSuccessHaptic } from "@/lib/feedback";

interface ScanCelebrationOverlayProps {
  visible: boolean;
  xpGained: number;
  leveledUp: boolean;
  level: number;
  /** 単一の子キャラ対象スキャン時 */
  childCharacter?: ChildCharacter;
  onDone: () => void;
}

/** 保存完了 — 紙がキャラに吸い込まれる演出 */
export function ScanCelebrationOverlay({
  visible,
  xpGained,
  leveledUp,
  level,
  childCharacter,
  onDone,
}: ScanCelebrationOverlayProps) {
  useEffect(() => {
    if (!visible) return;
    triggerSuccessHaptic();
    const t = setTimeout(onDone, leveledUp ? 2200 : 1600);
    return () => clearTimeout(t);
  }, [visible, leveledUp, onDone]);

  if (!visible) return null;

  const useChild = !!childCharacter;
  const emoji = useChild
    ? getCharacterDisplayEmoji(childCharacter)
    : getCharacterEmoji(level);
  const displayName = useChild ? childCharacter.characterName : DEFAULT_CHARACTER.name;
  const headline = leveledUp
    ? useChild
      ? `${displayName}が成長した！ 🎉`
      : "成長した！ 🎉"
    : pickCelebrationMessage(CELEBRATION_MESSAGES.documentSaved);
  const subtitle = useChild
    ? childCharacter.tagline
    : reassuranceMessage(DEFAULT_CHARACTER.name);
  const levelLine = leveledUp
    ? `Lv.${level} にレベルアップ！`
    : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-6"
      style={{
        background: "rgba(61, 53, 53, 0.55)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        className="celebration-pop w-full max-w-xs rounded-2xl p-6 text-center shadow-sm"
        style={{ background: "var(--color-surface)" }}
      >
        <div className="relative h-28 mb-2 flex items-end justify-center">
          <span className="celebration-paper absolute left-8 bottom-4 text-3xl">📄</span>
          <span className={`celebration-mascot text-5xl ${leveledUp ? "mascot-level-up" : "mascot-eat"}`}>
            {emoji}
          </span>
        </div>
        <p className="text-lg font-bold mb-1" style={{ color: "var(--color-text)" }}>
          {headline}
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--color-muted)" }}>
          {subtitle}
        </p>
        <p className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
          +{xpGained} XP
          {levelLine && ` · ${levelLine}`}
        </p>
      </div>
    </div>
  );
}
