"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Artwork, Child, Diary } from "@/lib/types";
import { formatChildAge, isSharedWithGrandparents } from "@/lib/childProfile";

type GrandparentsTab = "art" | "diary";

interface GrandparentsViewProps {
  childrenProfiles: Child[];
  diaries: Diary[];
  artworks: Artwork[];
  selectedChildIds: string[];
  kindergartenName: string;
  onBack: () => void;
}

export function GrandparentsView({
  childrenProfiles,
  diaries,
  artworks,
  selectedChildIds,
  kindergartenName,
  onBack,
}: GrandparentsViewProps) {
  const [tab, setTab] = useState<GrandparentsTab>("art");
  const [slideIndex, setSlideIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const visibleChildren =
    selectedChildIds.length > 0
      ? childrenProfiles.filter((c) => selectedChildIds.includes(c.id))
      : childrenProfiles;

  const filteredArtworks = useMemo(
    () =>
      artworks
        .filter((a) => isSharedWithGrandparents(a))
        .filter((a) =>
          selectedChildIds.length === 0 ? true : selectedChildIds.includes(a.childId)
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [artworks, selectedChildIds]
  );

  const filteredDiaries = useMemo(
    () =>
      diaries
        .filter((d) => isSharedWithGrandparents(d))
        .filter((d) =>
          selectedChildIds.length === 0 ? true : selectedChildIds.includes(d.childId)
        )
        .sort((a, b) => b.date.localeCompare(a.date)),
    [diaries, selectedChildIds]
  );

  const currentArt = filteredArtworks[slideIndex];

  useEffect(() => {
    setSlideIndex(0);
  }, [tab, selectedChildIds.join("|"), filteredArtworks.length]);

  useEffect(() => {
    if (tab !== "art" || !autoPlay || filteredArtworks.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((i) => (i + 1) % filteredArtworks.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [tab, autoPlay, filteredArtworks.length]);

  const childLabel = (id: string) =>
    childrenProfiles.find((c) => c.id === id)?.name.split(" ")[0] ?? "お子さま";

  const childAvatar = (id: string) =>
    childrenProfiles.find((c) => c.id === id)?.avatar ?? "👦";

  const goPrev = () => {
    if (filteredArtworks.length === 0) return;
    setSlideIndex((i) => (i - 1 + filteredArtworks.length) % filteredArtworks.length);
  };

  const goNext = () => {
    if (filteredArtworks.length === 0) return;
    setSlideIndex((i) => (i + 1) % filteredArtworks.length);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: "var(--color-bg)" }}>
      <div
        className="flex-shrink-0 px-4 pt-3 pb-4 text-white"
        style={{
          background: "linear-gradient(135deg, #f97316 0%, #fbbf24 100%)",
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-bold bg-white/95 text-orange-700 px-3 py-2 rounded-full shadow-sm active:scale-95 transition"
          >
            ← わが家へ
          </button>
          <span className="text-[10px] font-bold bg-white/20 px-2.5 py-1 rounded-full">
            シニアらくらく
          </span>
        </div>
        <h1 className="text-xl font-bold leading-tight">👴 じぃじ・ばぁば共有 👵</h1>
        <p className="text-sm mt-1 opacity-95 leading-relaxed">
          「祖父母に共有中」にした日記・お絵描きだけ表示します
        </p>
      </div>

      <div
        className="flex-shrink-0 px-3 py-2 border-b"
        style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
      >
        <div className="app-context-segment">
          <button
            type="button"
            onClick={() => setTab("art")}
            className={`app-context-segment-btn text-sm ${tab === "art" ? "app-context-segment-btn-active" : "text-slate-400"}`}
          >
            🎨 お絵描き ({filteredArtworks.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("diary")}
            className={`app-context-segment-btn text-sm ${tab === "diary" ? "app-context-segment-btn-active" : "text-slate-400"}`}
          >
            🌸 日記 ({filteredDiaries.length})
          </button>
        </div>
      </div>

      <div className="app-scroll-pane flex-1 p-4 pb-24 space-y-4">
        {visibleChildren.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {visibleChildren.map((c) => (
              <span
                key={c.id}
                className="text-sm font-bold px-3 py-1.5 rounded-full border"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                {c.avatar} {c.name.split(" ")[0]}
                {c.birthDate && formatChildAge(c.birthDate) ? ` · ${formatChildAge(c.birthDate)}` : ""}
              </span>
            ))}
          </div>
        )}

        {tab === "art" ? (
          filteredArtworks.length === 0 ? (
            <EmptyCard
              emoji="🖍️"
              title="共有中のお絵描きがありません"
              hint="思い出タブのお絵描き詳細で「👴👵 祖父母に共有中」に切り替えると、ここに表示されます"
            />
          ) : (
            <div className="space-y-3">
              <div
                className="rounded-3xl border overflow-hidden shadow-md"
                style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
              >
                <div
                  className="relative bg-white flex items-center justify-center"
                  style={{ minHeight: "min(62vw, 320px)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={currentArt.id}
                    src={currentArt.imageUrl}
                    alt={currentArt.title ?? "お絵描き"}
                    className="w-full max-h-[55vh] object-contain p-2"
                  />
                  {filteredArtworks.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        aria-label="前の作品"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/35 text-white flex items-center justify-center active:scale-95"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        aria-label="次の作品"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/35 text-white flex items-center justify-center active:scale-95"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{childAvatar(currentArt.childId)}</span>
                    <div>
                      <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
                        {currentArt.title || `${childLabel(currentArt.childId)}の作品`}
                      </p>
                      <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                        {currentArt.date}
                      </p>
                    </div>
                  </div>
                  {currentArt.caption && (
                    <p className="text-base leading-relaxed" style={{ color: "var(--color-text)" }}>
                      {currentArt.caption}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-wrap flex-1">
                  {filteredArtworks.map((art, idx) => (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => setSlideIndex(idx)}
                      className={`w-2.5 h-2.5 rounded-full transition ${
                        idx === slideIndex ? "bg-orange-500 scale-110" : "bg-slate-300"
                      }`}
                      aria-label={`${idx + 1}枚目`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAutoPlay((v) => !v)}
                  className="flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-full border"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                >
                  {autoPlay ? <Pause size={14} /> : <Play size={14} />}
                  {autoPlay ? "停止" : "自動"}
                </button>
              </div>
              <p className="text-center text-sm font-bold" style={{ color: "var(--color-muted)" }}>
                {slideIndex + 1} / {filteredArtworks.length} 点
              </p>
            </div>
          )
        ) : filteredDiaries.length === 0 ? (
          <EmptyCard
            emoji="🌸"
            title="共有中の日記がありません"
            hint="思い出タブの日記で「👴👵 祖父母に共有中」に切り替えると、ここに表示されます"
          />
        ) : (
          <div className="space-y-4">
            {filteredDiaries.slice(0, 10).map((diary) => {
              const child = childrenProfiles.find((c) => c.id === diary.childId);
              return (
                <article
                  key={diary.id}
                  className="rounded-3xl border p-5 shadow-sm space-y-3"
                  style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{child?.avatar ?? "👦"}</span>
                    <div>
                      <p className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
                        {child?.name.split(" ")[0] ?? "お子さま"}の日記
                      </p>
                      <p className="text-sm font-bold text-orange-600">{diary.date}</p>
                    </div>
                  </div>
                  <p
                    className="text-lg leading-loose font-medium rounded-2xl p-4"
                    style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
                  >
                    {diary.content}
                  </p>
                </article>
              );
            })}
          </div>
        )}

        <div
          className="rounded-2xl p-4 text-center text-sm leading-relaxed"
          style={{ background: "var(--color-primary-light)", color: "var(--color-text)" }}
        >
          <p className="font-bold">{kindergartenName} の思い出</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
            文字を大きく・ボタンを少なくした、祖父母向けの見やすい画面です
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({
  emoji,
  title,
  hint,
}: {
  emoji: string;
  title: string;
  hint: string;
}) {
  return (
    <div
      className="text-center py-14 rounded-3xl border px-6 space-y-3"
      style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
    >
      <p className="text-4xl">{emoji}</p>
      <p className="text-base font-bold" style={{ color: "var(--color-text)" }}>
        {title}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--color-muted)" }}>
        {hint}
      </p>
    </div>
  );
}
