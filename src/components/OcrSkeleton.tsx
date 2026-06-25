"use client";

interface OcrSkeletonProps {
  message?: string;
  compact?: boolean;
}

export function OcrSkeleton({ message = "読み取り中…", compact = false }: OcrSkeletonProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${compact ? "py-6" : "py-10"}`}
      aria-busy="true"
      aria-live="polite"
    >
      <div
        className={`rounded-full border-2 border-teal-200 border-t-teal-600 animate-spin ${
          compact ? "w-8 h-8" : "w-10 h-10"
        }`}
      />
      <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
        {message}
      </p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
