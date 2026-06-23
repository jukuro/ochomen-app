"use client";

import { useState } from "react";
import { Plus, X, Camera, BookMarked, Mic, FileText, Palette } from "lucide-react";

interface MemoriesFabProps {
  onScanDocument: () => void;
  onScanOchomen: () => void;
  onStartDiary: () => void;
  onAddArtwork?: () => void;
  onOtherImport?: () => void;
}

export function MemoriesFab({
  onScanDocument,
  onScanOchomen,
  onStartDiary,
  onAddArtwork,
  onOtherImport,
}: MemoriesFabProps) {
  const [open, setOpen] = useState(false);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <>
      {open && (
        <div
          className="absolute inset-0 z-30 bg-black/25"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {open && (
        <div
          className="absolute right-4 z-40 flex flex-col gap-2 animate-slide-up"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          {onOtherImport && (
            <button
              type="button"
              onClick={() => run(onOtherImport)}
              className="flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-lg border text-left min-w-[200px] active:scale-[0.98] transition"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-bg)" }}>
                <FileText size={18} style={{ color: "var(--color-muted)" }} />
              </span>
              <span>
                <span className="block text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  その他の登録
                </span>
                <span className="block text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                  メール・PDF・手動
                </span>
              </span>
            </button>
          )}
          {onAddArtwork && (
            <button
              type="button"
              onClick={() => run(onAddArtwork)}
              className="flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-lg border text-left min-w-[200px] active:scale-[0.98] transition"
              style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fef3c7" }}>
                <Palette size={18} className="text-amber-600" />
              </span>
              <span>
                <span className="block text-sm font-bold" style={{ color: "var(--color-text)" }}>
                  お絵描きを追加
                </span>
                <span className="block text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                  作品の写真
                </span>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => run(onStartDiary)}
            className="flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-lg border text-left min-w-[200px] active:scale-[0.98] transition"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-secondary-light)" }}>
              <Mic size={18} style={{ color: "var(--color-secondary)" }} />
            </span>
            <span>
              <span className="block text-sm font-bold" style={{ color: "var(--color-text)" }}>
                日記をつぶやく
              </span>
              <span className="block text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                音声・テキスト
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => run(onScanOchomen)}
            className="flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-lg border text-left min-w-[200px] active:scale-[0.98] transition"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--color-primary-light)" }}>
              <BookMarked size={18} style={{ color: "var(--color-primary)" }} />
            </span>
            <span>
              <span className="block text-sm font-bold" style={{ color: "var(--color-text)" }}>
                お帳面をスキャン
              </span>
              <span className="block text-[10px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                連絡帳・お帳面
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => run(onScanDocument)}
            className="flex items-center gap-3 pl-3 pr-4 py-3 rounded-2xl shadow-lg border text-left min-w-[200px] active:scale-[0.98] transition"
            style={{ background: "var(--color-primary)", borderColor: "var(--color-primary)" }}
          >
            <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20">
              <Camera size={18} className="text-white" />
            </span>
            <span>
              <span className="block text-sm font-bold text-white">紙をスキャン</span>
              <span className="block text-[10px] mt-0.5 text-white/80">お便り・プリント</span>
            </span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "メニューを閉じる" : "思い出を追加"}
        aria-expanded={open}
        className="absolute right-4 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition active:scale-95"
        style={{
          bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          background: open ? "var(--color-text)" : "var(--color-primary)",
          color: "white",
          boxShadow: "0 8px 28px rgba(232, 130, 106, 0.35)",
        }}
      >
        {open ? <X size={24} /> : <Plus size={26} strokeWidth={2.5} />}
      </button>
    </>
  );
}
