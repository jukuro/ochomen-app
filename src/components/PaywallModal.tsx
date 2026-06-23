"use client";

import { X, CreditCard, Bell, Calendar, Users } from "lucide-react";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  title: string;
  description: string;
}

const PREMIUM_FEATURES = [
  { icon: Users, text: "複数のお子さまを登録" },
  { icon: Bell, text: "提出期限のリマインド通知" },
  { icon: Calendar, text: "Googleカレンダー自動同期" },
];

export function PaywallModal({
  open,
  onClose,
  onUpgrade,
  title,
  description,
}: PaywallModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-[55]">
      <div className="bg-white w-full rounded-t-3xl p-6 space-y-5 animate-slide-up">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              プレミアムプラン
            </span>
            <h3 className="font-bold text-slate-800 text-lg mt-2">{title}</h3>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 p-1">
            <X size={20} />
          </button>
        </div>

        <ul className="space-y-3">
          {PREMIUM_FEATURES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-slate-700">
              <span className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                <Icon size={18} />
              </span>
              {text}
            </li>
          ))}
        </ul>

        <div className="space-y-2 pt-1">
          <button
            onClick={onUpgrade}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            <CreditCard size={16} />
            プレミアムにアップグレード（月額500円）
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-400 text-sm font-medium"
          >
            あとで
          </button>
        </div>
      </div>
    </div>
  );
}
