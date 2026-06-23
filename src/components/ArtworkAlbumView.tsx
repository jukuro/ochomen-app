"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RotateCcw, RotateCw, Trash2, X } from "lucide-react";
import type { Artwork, Child } from "@/lib/types";
import { APP_TODAY } from "@/lib/dates";
import { compressAndRotate, rotateImageDataUrl } from "@/lib/imageCompress";
import { ShareWithGrandparentsToggle } from "@/components/ShareWithGrandparentsToggle";
import { createLocalId } from "@/lib/ids";

interface ArtworkAlbumViewProps {
  artworks: Artwork[];
  children: Child[];
  selectedChildIds: string[];
  addRequestId?: number;
  openDetailId?: string | null;
  onDetailClosed?: () => void;
  onAdd: (artwork: Artwork) => void;
  onUpdate: (
    id: string,
    patch: Partial<Pick<Artwork, "title" | "caption" | "imageUrl" | "shareWithGrandparents">>
  ) => void;
  onDelete: (id: string) => void;
  onToast: (message: string) => void;
}

export function ArtworkAlbumView({
  artworks,
  children,
  selectedChildIds,
  addRequestId = 0,
  openDetailId = null,
  onDetailClosed,
  onAdd,
  onUpdate,
  onDelete,
  onToast,
}: ArtworkAlbumViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [pickChildId, setPickChildId] = useState<string>("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [isRotating, setIsRotating] = useState(false);

  const visibleChildren =
    selectedChildIds.length > 0
      ? children.filter((c) => selectedChildIds.includes(c.id))
      : children;

  const filtered = artworks.filter((a) => {
    if (selectedChildIds.length === 0) return true;
    return selectedChildIds.includes(a.childId);
  });

  const defaultChildId =
    visibleChildren.length === 1
      ? visibleChildren[0].id
      : selectedChildIds[0] ?? children[0]?.id ?? "c1";

  useEffect(() => {
    if (openDetailId) setDetailId(openDetailId);
  }, [openDetailId]);

  const closeDetail = () => {
    setDetailId(null);
    onDetailClosed?.();
  };

  useEffect(() => {
    if (addRequestId > 0) {
      setPickChildId(defaultChildId);
      fileInputRef.current?.click();
    }
  }, [addRequestId, defaultChildId]);

  const detail = detailId ? artworks.find((a) => a.id === detailId) : null;

  useEffect(() => {
    if (detail) {
      setEditTitle(detail.title ?? "");
      setEditCaption(detail.caption ?? "");
    }
  }, [detail]);

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) {
      onToast("画像ファイルを選んでください");
      return;
    }
    const childId = pickChildId || defaultChildId;
    setIsAdding(true);
    try {
      const { previewUrl } = await compressAndRotate(file, 0);
      onAdd({
        id: createLocalId("art"),
        childId,
        date: APP_TODAY,
        imageUrl: previewUrl,
      });
      onToast("🎨 お絵描きをアルバムに追加しました");
    } catch {
      onToast("画像の読み込みに失敗しました");
    } finally {
      setIsAdding(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveDetail = () => {
    if (!detailId) return;
    onUpdate(detailId, {
      title: editTitle.trim() || undefined,
      caption: editCaption.trim() || undefined,
    });
    onToast("保存しました");
    closeDetail();
  };

  const handleRotate = async (deg: 90 | 270) => {
    if (!detail) return;
    setIsRotating(true);
    try {
      const { previewUrl } = await rotateImageDataUrl(detail.imageUrl, deg);
      onUpdate(detail.id, { imageUrl: previewUrl });
    } catch {
      onToast("回転に失敗しました");
    } finally {
      setIsRotating(false);
    }
  };

  const childLabel = (id: string) =>
    children.find((c) => c.id === id)?.name.split(" ")[0] ?? "お子さま";

  const childAvatar = (id: string) =>
    children.find((c) => c.id === id)?.avatar ?? "👦";

  return (
    <div className="app-scroll-pane p-4 pb-24 space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      {/* 追加エリア */}
      <div
        className="rounded-2xl border-2 border-dashed p-4 space-y-3"
        style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-light)" }}
      >
        <p className="text-xs font-bold" style={{ color: "var(--color-primary)" }}>
          🎨 お絵描きを残す
        </p>
        <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
          作品の写真を撮るか、カメラロールから選んでアルバムに保存できます。
        </p>

        {visibleChildren.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            {visibleChildren.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setPickChildId(c.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                  (pickChildId || defaultChildId) === c.id
                    ? "bg-white border-[var(--color-primary)] text-[var(--color-primary)]"
                    : "bg-white/60 border-transparent text-slate-500"
                }`}
              >
                {c.avatar} {c.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={isAdding}
            onClick={() => {
              setPickChildId(defaultChildId);
              fileInputRef.current?.setAttribute("capture", "environment");
              fileInputRef.current?.click();
            }}
            className="flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 text-white disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            撮影する
          </button>
          <button
            type="button"
            disabled={isAdding}
            onClick={() => {
              setPickChildId(defaultChildId);
              fileInputRef.current?.removeAttribute("capture");
              fileInputRef.current?.click();
            }}
            className="flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-white disabled:opacity-60"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <ImagePlus size={16} />
            写真を選ぶ
          </button>
        </div>
      </div>

      {/* ギャラリー */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-muted)" }}>
            アルバム · {filtered.length} 点
          </span>
        </div>

        {filtered.length === 0 ? (
          <div
            className="text-center py-14 rounded-2xl border text-sm space-y-2"
            style={{ borderColor: "var(--color-border)", color: "var(--color-muted)", background: "var(--color-surface)" }}
          >
            <p className="text-3xl">🖍️</p>
            <p>まだ作品がありません</p>
            <p className="text-xs">上のボタンから最初の1枚を追加しましょう</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((art) => (
              <button
                key={art.id}
                type="button"
                onClick={() => setDetailId(art.id)}
                className="text-left rounded-2xl overflow-hidden border shadow-sm active:scale-[0.98] transition bg-white"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div className="aspect-square bg-slate-100 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={art.imageUrl}
                    alt={art.title ?? "お絵描き"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-2.5 space-y-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{childAvatar(art.childId)}</span>
                    <span className="text-[10px] font-bold truncate" style={{ color: "var(--color-text)" }}>
                      {art.title || `${childLabel(art.childId)}の作品`}
                    </span>
                  </div>
                  <span className="text-[9px] block" style={{ color: "var(--color-muted)" }}>
                    {art.date}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 詳細モーダル */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div
            className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-xl"
            style={{ background: "var(--color-surface)" }}
          >
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b bg-white/95 backdrop-blur z-10" style={{ borderColor: "var(--color-border)" }}>
              <span className="text-sm font-bold">{childAvatar(detail.childId)} {childLabel(detail.childId)}の作品</span>
              <button type="button" onClick={closeDetail} aria-label="閉じる" className="p-2 rounded-full hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-2xl overflow-hidden bg-slate-100 border relative" style={{ borderColor: "var(--color-border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={detail.imageUrl}
                  alt=""
                  className={`w-full max-h-[50vh] object-contain mx-auto ${isRotating ? "opacity-60" : ""}`}
                />
                {isRotating && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={28} className="animate-spin text-slate-500" />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isRotating}
                  onClick={() => void handleRotate(270)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-white disabled:opacity-50"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  <RotateCcw size={15} />
                  左に回転
                </button>
                <button
                  type="button"
                  disabled={isRotating}
                  onClick={() => void handleRotate(90)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border bg-white disabled:opacity-50"
                  style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
                >
                  右に回転
                  <RotateCw size={15} />
                </button>
              </div>

              <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>{detail.date}</p>

              <ShareWithGrandparentsToggle
                shared={detail.shareWithGrandparents === true}
                onToggle={() => {
                  const next = !detail.shareWithGrandparents;
                  onUpdate(detail.id, { shareWithGrandparents: next });
                  onToast(next ? "👴👵 祖父母に共有します" : "祖父母への共有をオフにしました");
                }}
              />

              <div className="space-y-2">
                <label className="text-[10px] font-bold block" style={{ color: "var(--color-muted)" }}>タイトル</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="例：虹の絵"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--color-primary)]"
                  style={{ borderColor: "var(--color-border)" }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold block" style={{ color: "var(--color-muted)" }}>メモ</label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={2}
                  placeholder="できごとや先生へのコメントなど"
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--color-primary)] resize-none"
                  style={{ borderColor: "var(--color-border)" }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("この作品を削除しますか？")) {
                      onDelete(detail.id);
                      closeDetail();
                      onToast("削除しました");
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 border text-red-600 border-red-100 bg-red-50"
                >
                  <Trash2 size={14} />
                  削除
                </button>
                <button
                  type="button"
                  onClick={saveDetail}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                  style={{ background: "var(--color-primary)" }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
