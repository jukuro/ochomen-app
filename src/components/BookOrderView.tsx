"use client";

import { BookOpen } from "lucide-react";
import type { Artwork, Child, Diary } from "@/lib/types";
import { buildDigitalBookTitle, openDigitalBookPrintPreview } from "@/lib/digitalBook";

interface BookOrderViewProps {
  childrenProfiles: Child[];
  diaries: Diary[];
  artworks: Artwork[];
  kindergartenName: string;
  onBack: () => void;
  onToast: (message: string) => void;
}

export function BookOrderView({
  childrenProfiles,
  diaries,
  artworks,
  kindergartenName,
  onBack,
  onToast,
}: BookOrderViewProps) {
  const monthLabel = `${new Date().getFullYear()}年${new Date().getMonth() + 1}月`;
  const title = buildDigitalBookTitle(childrenProfiles, kindergartenName, monthLabel);
  const pageCount = diaries.length + artworks.length;

  const handlePrintPreview = () => {
    const ok = openDigitalBookPrintPreview({
      title,
      diaries,
      artworks,
      children: childrenProfiles,
      kindergartenName,
    });
    if (ok) {
      onToast("印刷プレビューを開きました。PDFに保存できます 📕");
    } else {
      onToast("ポップアップがブロックされました。ブラウザの設定を確認してください");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: "var(--color-bg)" }}>
      <div
        className="flex-shrink-0 px-4 pt-3 pb-4 text-white"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #10b981 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-bold bg-white/95 text-teal-700 px-3 py-2 rounded-full shadow-sm active:scale-95 transition"
          >
            ← わが家へ
          </button>
          <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full">
            Premium 特典
          </span>
        </div>
        <h1 className="text-xl font-bold leading-tight flex items-center gap-2">
          <BookOpen size={22} />
          デジタルブック
        </h1>
        <p className="text-sm mt-1 opacity-95 leading-relaxed">
          成長日記とお絵描きを自動レイアウト。PDF保存や将来の製本に使えます
        </p>
      </div>

      <div className="app-scroll-pane flex-1 p-4 pb-24 space-y-4">
        <div
          className="rounded-3xl border p-5 shadow-sm space-y-4"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <span className="text-xs font-bold block" style={{ color: "var(--color-muted)" }}>
            📖 絵本レイアウトのプレビュー
          </span>

          <div
            className="flex flex-col items-center justify-center p-6 border-4 border-double rounded-2xl shadow-inner min-h-[160px] relative"
            style={{ borderColor: "rgba(13,148,136,0.25)", background: "var(--color-bg)" }}
          >
            <span
              className="absolute top-2 left-2 text-[10px] font-bold"
              style={{ color: "var(--color-primary)" }}
            >
              表紙イメージ
            </span>
            <div className="text-4xl mb-2">📕</div>
            <p className="text-sm font-bold text-center" style={{ color: "var(--color-text)" }}>
              {title}
            </p>
            <p className="text-[10px] mt-1" style={{ color: "var(--color-muted)" }}>
              {monthLabel}版 · 全 {pageCount} ページ
            </p>
            <div className="mt-4 flex gap-1.5 flex-wrap justify-center">
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--color-primary)", color: "var(--color-primary)", background: "var(--color-primary-light)" }}>
                日記 {diaries.length}件
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ borderColor: "var(--color-accent)", color: "var(--color-accent)", background: "var(--color-accent-light)" }}>
                お絵描き {artworks.length}点
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold" style={{ color: "var(--color-text)" }}>
              <span>思い出絵本 (A5変形・24p〜)</span>
              <span style={{ color: "var(--color-primary)" }}>¥1,980 / 冊</span>
            </div>
            <p className="text-[10px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
              ※プレミアム会員は年1冊の製本・配送クーポンをご利用いただけます（外部API連携は準備中）
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintPreview}
            disabled={pageCount === 0}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-md transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: "var(--color-primary)" }}
          >
            印刷プレビュー / PDF保存 📕
          </button>

          {pageCount === 0 && (
            <p className="text-center text-xs" style={{ color: "var(--color-muted)" }}>
              思い出タブで日記やお絵描きを追加すると、ブックに載せられます
            </p>
          )}
        </div>

        <div
          className="rounded-2xl p-4 text-center text-sm leading-relaxed"
          style={{ background: "var(--color-primary-light)", color: "var(--color-text)" }}
        >
          <p className="font-bold">{kindergartenName} の思い出</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
            外部印刷サービスとの連携は次のフェーズで追加予定です
          </p>
        </div>
      </div>
    </div>
  );
}
