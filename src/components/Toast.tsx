"use client";

import { useEffect } from "react";
import { Check, Sparkles } from "lucide-react";

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
  variant?: "default" | "celebration";
}

export function Toast({
  message,
  visible,
  onClose,
  duration = 3000,
  variant = "default",
}: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [visible, onClose, duration]);

  if (!visible) return null;

  const isCelebration = variant === "celebration";

  return (
    <div className="absolute top-14 left-4 right-4 z-[60] animate-fade-in">
      <div
        className={`rounded-xl px-4 py-3 shadow-lg flex items-center gap-2.5 text-sm font-medium ${
          isCelebration ? "text-white" : "bg-slate-800 text-white"
        }`}
        style={
          isCelebration
            ? { background: "var(--color-primary)", boxShadow: "0 8px 24px rgba(232, 130, 106, 0.35)" }
            : undefined
        }
      >
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: isCelebration ? "rgba(255,255,255,0.25)" : undefined }}
        >
          {isCelebration ? <Sparkles size={14} /> : <Check size={14} className="text-white" />}
        </span>
        <span className="leading-snug">{message}</span>
      </div>
    </div>
  );
}
