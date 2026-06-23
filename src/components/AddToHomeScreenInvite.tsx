"use client";

import { useEffect, useState } from "react";
import { Smartphone, Share, Plus, X } from "lucide-react";
import {
  detectPwaPlatform,
  getDeferredInstallPrompt,
  isStandaloneMode,
  recordInstallInviteDismissed,
  subscribeInstallPrompt,
  triggerPwaInstall,
  wasInstalledOnce,
  type PwaPlatform,
} from "@/lib/pwaInstall";

interface AddToHomeScreenInviteProps {
  open: boolean;
  onClose: () => void;
  onToast?: (message: string) => void;
}

/**
 * ログイン直後などに表示する「ホーム画面に追加」招待ボトムシート。
 * - Android / デスクトップ: beforeinstallprompt を直接トリガー
 * - iOS: Safari の共有 →「ホーム画面に追加」手順を案内
 * - 一度削除して再追加するケースでは案内文言を切り替える
 */
export function AddToHomeScreenInvite({ open, onClose, onToast }: AddToHomeScreenInviteProps) {
  const [platform, setPlatform] = useState<PwaPlatform>("desktop");
  const [canPrompt, setCanPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [reinstall, setReinstall] = useState(false);

  useEffect(() => {
    if (!open) return;
    const refresh = () => {
      setPlatform(detectPwaPlatform());
      setCanPrompt(!!getDeferredInstallPrompt());
      setReinstall(wasInstalledOnce() && !isStandaloneMode());
    };
    refresh();
    return subscribeInstallPrompt(refresh);
  }, [open]);

  if (!open) return null;

  const isIos = platform === "ios";

  const handleDismiss = () => {
    recordInstallInviteDismissed();
    onClose();
  };

  const handleAdd = async () => {
    if (isIos) {
      // iOS はプログラムから追加できないため、案内のまま保持（閉じるは別ボタン）
      return;
    }
    if (canPrompt) {
      setInstalling(true);
      try {
        const outcome = await triggerPwaInstall();
        if (outcome === "accepted") {
          onToast?.("ホーム画面に追加しました 🎉");
          onClose();
        } else if (outcome === "dismissed") {
          handleDismiss();
        } else {
          onToast?.("追加ダイアログを表示できませんでした");
        }
      } finally {
        setInstalling(false);
      }
      return;
    }
    if (platform === "android") {
      onToast?.("Chrome 右上 ⋮ →「ホーム画面に追加」を選んでください");
    } else {
      onToast?.("ブラウザのメニューから「インストール」を選べます");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end bg-black/50" onClick={handleDismiss}>
      <div
        className="bg-white w-full rounded-t-3xl p-5 space-y-4 animate-slide-up"
        style={{ paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
              <Smartphone size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 leading-tight">
                {reinstall ? "ホーム画面に追加し直しますか？" : "ホーム画面に追加しませんか？"}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {reinstall
                  ? "アイコンが見つからないようです。もう一度追加できます。"
                  : "アプリのように、アイコンからすぐ開けます。"}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleDismiss} className="text-slate-400 p-1 -mr-1">
            <X size={20} />
          </button>
        </div>

        {isIos ? (
          <ol className="space-y-3 text-sm text-slate-700 bg-slate-50 rounded-xl p-3.5 border border-slate-200/50">
            <li className="flex gap-3 items-center">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="flex items-center gap-1.5 flex-wrap">
                画面下の <Share size={16} className="text-blue-500" /> <strong>共有</strong> をタップ
              </span>
            </li>
            <li className="flex gap-3 items-center">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span><strong>「ホーム画面に追加」</strong> を選ぶ</span>
            </li>
            <li className="flex gap-3 items-center">
              <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span>右上の <strong>「追加」</strong> をタップ</span>
            </li>
          </ol>
        ) : (
          <button
            type="button"
            disabled={installing}
            onClick={() => void handleAdd()}
            className="w-full py-3 rounded-xl bg-teal-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-60"
          >
            <Plus size={16} />
            {installing ? "準備中…" : reinstall ? "もう一度追加する" : "ホーム画面に追加"}
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-bold active:scale-[0.98] transition"
        >
          {isIos ? "閉じる" : "あとで"}
        </button>
      </div>
    </div>
  );
}
