"use client";

interface TodoReviewBadgeProps {
  className?: string;
}

export function TodoReviewBadge({ className = "" }: TodoReviewBadgeProps) {
  return (
    <span
      className={`bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${className}`}
    >
      ⚠️ 要確認
    </span>
  );
}
