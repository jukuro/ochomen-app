"use client";

import type { ReactNode } from "react";

/** 画面下部（タブナビの直上）に置く、画面別の頻出操作バー */
export function ScreenContextBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`app-screen-context-bar flex-shrink-0 border-t ${className}`}
      style={{ borderColor: "var(--color-border)" }}
    >
      {children}
    </div>
  );
}
