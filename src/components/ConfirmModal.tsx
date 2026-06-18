"use client";

import { AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  open: boolean;
  message: string;
  detail?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  message,
  detail,
  confirmLabel = "削除する",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-6"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-red-500 flex-shrink-0">
            <AlertTriangle size={20} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-800 leading-snug">{message}</p>
            {detail && (
              <p className="text-xs text-slate-500 leading-relaxed">{detail}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-bold"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onCancel(); }}
            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
