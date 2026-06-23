"use client";

import { useEffect, useState } from "react";
import { Smartphone, Share, Plus, Check, X } from "lucide-react";
import {
  detectPwaPlatform,
  getDeferredInstallPrompt,
  isStandaloneMode,
  subscribeInstallPrompt,
  triggerPwaInstall,
  type PwaPlatform,
} from "@/lib/pwaInstall";

interface AddToHomeScreenSectionProps {
  onToast?: (message: string) => void;
}

export function AddToHomeScreenSection({ onToast }: AddToHomeScreenSectionProps) {
  const [platform, setPlatform] = useState<PwaPlatform>("desktop");
  const [standalone, setStandalone] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setPlatform(detectPwaPlatform());
      setStandalone(isStandaloneMode());
      setCanPrompt(!!getDeferredInstallPrompt());
    };
    refresh();
    return subscribeInstallPrompt(refresh);
  }, []);

  const handleInstallClick = async () => {
    if (standalone) {
      onToast?.("すでにホーム画面から起動しています");
      return;
    }

    if (platform === "ios") {
      setShowIosGuide(true);
      return;
    }

    if (canPrompt) {
      setInstalling(true);
      try {
        const outcome = await triggerPwaInstall();
        if (outcome === "accepted") {
          onToast?.("ホーム画面に追加しました 🎉");
        } else if (outcome === "dismissed") {
          onToast?.("追加をキャンセルしました");
        } else {
          onToast?.("追加ダイアログを表示できませんでした");
        }
      } finally {
        setInstalling(false);
      }
      return;
    }

    if (platform === "android") {
      onToast?.("Chrome の ⋮ メニュー →「ホーム画面に追加」を選んでください");
      return;
    }

    onToast?.("Chrome / Edge / Safari で開くと追加できます");
  };

  return (
    <>
      <div className="space-y-3 border-t border-slate-100 pt-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
          ホーム画面に追加
        </span>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/50 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0">
              <Smartphone size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">
                {standalone ? "ホーム画面から起動中" : "アイコンからすぐ開く"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                {standalone
                  ? "お帳面アイコンから起動しています。削除した場合は下のボタンで再追加できます。"
                  : "ブラウザのタブではなく、アプリのようにホーム画面に置けます。"}
              </p>
            </div>
          </div>

          {standalone ? (
            <div className="flex items-center gap-2 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
              <Check size={14} />
              追加済み（スタンドアロン起動）
            </div>
          ) : (
            <button
              type="button"
              disabled={installing}
              onClick={() => void handleInstallClick()}
              className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-[0.98] transition disabled:opacity-60"
            >
              <Plus size={14} />
              {installing ? "準備中…" : "ホーム画面に追加"}
            </button>
          )}

          {!standalone && platform === "android" && !canPrompt && (
            <p className="text-[10px] text-slate-500 leading-relaxed">
              ボタンが効かない場合: Chrome 右上 ⋮ →「ホーム画面に追加」または「アプリをインストール」
            </p>
          )}
        </div>
      </div>

      {showIosGuide && (
        <div
          className="fixed inset-0 z-[110] flex items-end bg-black/50"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className="bg-white w-full rounded-t-3xl p-5 space-y-4 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800">iPhone / iPad で追加</h4>
              <button type="button" onClick={() => setShowIosGuide(false)} className="text-slate-400 p-1">
                <X size={20} />
              </button>
            </div>
            <ol className="space-y-3 text-sm text-slate-700">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <span className="flex items-center gap-1.5 flex-wrap">
                  画面下の <Share size={16} className="text-blue-500" /> <strong>共有</strong> をタップ
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                <span>
                  一覧から <strong>「ホーム画面に追加」</strong> を選ぶ
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                <span>
                  右上の <strong>「追加」</strong> をタップ
                </span>
              </li>
            </ol>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Safari で開いている必要があります。一度削除した場合も、同じ手順で再追加できます。
            </p>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-3 rounded-xl bg-teal-600 text-white text-sm font-bold"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
  );
}
