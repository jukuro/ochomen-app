"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

interface ToastProps {
  message: string;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, visible, onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [visible, onClose, duration]);

  if (!visible) return null;

  return (
    <div className="absolute top-14 left-4 right-4 z-[60] animate-fade-in">
      <div className="bg-slate-800 text-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-2.5 text-sm font-medium">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
          <Check size={14} />
        </span>
        <span className="leading-snug">{message}</span>
      </div>
    </div>
  );
}
