"use client";

import { MascotCharacter, type MascotAnim } from "@/components/MascotCharacter";
import type { UserProgress } from "@/lib/userProgress";

interface OcrSkeletonProps {
  message?: string;
  compact?: boolean;
  userProgress?: UserProgress;
  mascotAnim?: MascotAnim;
}

/** OCR待ち — キャラ + Skeleton（待たされている感を減らす） */
export function OcrSkeleton({
  message = "プリントを読み解いています",
  compact = false,
  userProgress,
  mascotAnim = "eat",
}: OcrSkeletonProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] ${
        compact ? "p-4 space-y-3" : "p-6 space-y-4"
      }`}
      role="status"
      aria-live="polite"
    >
      {userProgress ? (
        <MascotCharacter progress={userProgress} size={compact ? "sm" : "md"} anim={mascotAnim} showBar={false} />
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary-light)] flex items-center justify-center text-lg flex-shrink-0 mascot-eat">
            📄
          </div>
          <p className="text-sm font-bold text-[var(--color-text)]">{message}</p>
        </div>
      )}
      <p className={`text-sm font-bold ${userProgress ? "-mt-1" : ""}`} style={{ color: "var(--color-text)" }}>
        {message}
      </p>
      <div className="space-y-2">
        <div className="h-3 rounded-full app-shimmer w-full" />
        <div className="h-3 rounded-full app-shimmer w-[88%]" />
        <div className="h-3 rounded-full app-shimmer w-[72%]" />
        {!compact && (
          <>
            <div className="h-3 rounded-full app-shimmer w-[94%] mt-3" />
            <div className="h-3 rounded-full app-shimmer w-[60%]" />
          </>
        )}
      </div>
    </div>
  );
}
