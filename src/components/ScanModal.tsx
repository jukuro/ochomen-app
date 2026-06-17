"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  FileText,
  Loader2,
  RotateCcw,
  RotateCw,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import type { Child, TodoAssignee, TodoDraft, Member } from "@/lib/types";

interface ScanModalProps {
  open: boolean;
  childrenProfiles: Child[];
  categories: string[];
  members: Member[];
  targetChildIds: string[];
  selectedCategory: string;
  importMethod: "camera" | "paste" | "pdf";
  onSelectImportMethod: (method: "camera" | "paste" | "pdf") => void;
  scannedImage: string | null;
  ocrTextResult: string;
  isScanning: boolean;
  todoDrafts: TodoDraft[];
  onClose: () => void;
  onResetScan: () => void;
  onToggleTargetChild: (childId: string) => void;
  onSelectCategory: (category: string) => void;
  /** 圧縮・回転済み base64 + mimeType + プレビューURL を渡す */
  onScanProcessed: (base64: string, mimeType: string, previewUrl: string) => void;
  onScanText: (text: string) => void;
  onChangeOcrText: (text: string) => void;
  onAddTodoDraft: () => void;
  onUpdateTodoDraft: (
    draftId: string,
    changes: Partial<Pick<TodoDraft, "task" | "dueDate" | "assignedTo" | "type" | "reminderAt">>
  ) => void;
  onRemoveTodoDraft: (draftId: string) => void;
  onSubmit: () => void;
}

/** canvas で画像を回転・圧縮して base64 を返す */
async function compressAndRotate(
  file: File,
  rotationDeg: number
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const img = new globalThis.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_SIDE = 1600;
      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;

      // 90°/270° のときは幅と高さを入れ替える
      const swap = rotationDeg === 90 || rotationDeg === 270;
      const outW = swap ? srcH : srcW;
      const outH = swap ? srcW : srcH;

      const scale = Math.min(1, MAX_SIDE / Math.max(outW, outH));
      const canvasW = Math.round(outW * scale);
      const canvasH = Math.round(outH * scale);

      const canvas = document.createElement("canvas");
      canvas.width = canvasW;
      canvas.height = canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unavailable")); return; }

      ctx.translate(canvasW / 2, canvasH / 2);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.drawImage(img, -srcW * scale / 2, -srcH * scale / 2, srcW * scale, srcH * scale);

      URL.revokeObjectURL(objectUrl);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({
        base64: dataUrl.split(",")[1],
        mimeType: "image/jpeg",
        previewUrl: dataUrl,
      });
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("image load failed")); };
    img.src = objectUrl;
  });
}

export function ScanModal({
  open,
  childrenProfiles,
  categories,
  members,
  targetChildIds,
  selectedCategory,
  importMethod,
  scannedImage,
  ocrTextResult,
  isScanning,
  todoDrafts,
  onClose,
  onResetScan,
  onToggleTargetChild,
  onSelectCategory,
  onScanProcessed,
  onScanText,
  onChangeOcrText,
  onAddTodoDraft,
  onUpdateTodoDraft,
  onRemoveTodoDraft,
  onSubmit,
}: ScanModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 選択済みファイル（スキャン前の回転・確認ステップ）
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [pasteText, setPasteText] = useState("");

  if (!open) return null;

  const headerTitle =
    importMethod === "paste"
      ? "LINE・メール貼付"
      : importMethod === "pdf"
      ? "PDF・ファイル読込"
      : "プリントスキャン";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setPendingPreviewUrl(url);
    setRotation(0);
    e.target.value = "";
  };

  const triggerFileInput = (accept: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleRotate = (dir: "left" | "right") => {
    setRotation((prev) => (prev + (dir === "right" ? 90 : 270)) % 360);
  };

  const handleStartScan = async () => {
    if (!pendingFile) return;
    setIsCompressing(true);
    try {
      const { base64, mimeType, previewUrl } = await compressAndRotate(pendingFile, rotation);
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
      setPendingFile(null);
      setPendingPreviewUrl(null);
      onScanProcessed(base64, mimeType, previewUrl);
    } catch {
      alert("画像の処理に失敗しました。別の画像をお試しください。");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleResetPending = () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setRotation(0);
  };

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[90%] overflow-y-auto animate-slide-up text-slate-800">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
            {importMethod === "paste" ? "📋" : importMethod === "pdf" ? "📄" : "📸"} {headerTitle}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {/* 対象メンバー */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">対象メンバー</label>
            <div className="flex gap-2 flex-wrap">
              {childrenProfiles.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => onToggleTargetChild(child.id)}
                  className={`px-3 py-2 rounded-full text-xs font-bold ${
                    targetChildIds.includes(child.id)
                      ? "bg-teal-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {child.avatar} {child.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          {/* カテゴリー */}
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">カテゴリー</label>
            <select
              value={selectedCategory}
              onChange={(event) => onSelectCategory(event.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-teal-500 bg-white"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* ── ファイル選択前のスキャンボタン ── */}
          {!pendingFile && !ocrTextResult && (
            <div className="space-y-3 pt-1">
              {isScanning ? (
                <div className="border-2 border-dashed border-teal-300 bg-teal-50 rounded-xl p-8 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-teal-600" />
                  <span className="text-sm text-teal-600 font-bold">AIが読み取り中...</span>
                </div>
              ) : (
                <>
                  {importMethod === "camera" && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-400 block">写真をスキャン</span>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => triggerFileInput("image/*")}
                          className="flex-1 border-2 border-dashed border-teal-200 bg-teal-50/50 hover:bg-teal-50 rounded-xl p-6 flex flex-col items-center gap-1.5 text-teal-600 transition"
                        >
                          <Camera size={24} />
                          <span className="text-xs font-bold">手紙・配布物を撮影</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerFileInput("image/*")}
                          className="flex-1 border-2 border-dashed border-amber-200 bg-amber-50/50 hover:bg-amber-50 rounded-xl p-6 flex flex-col items-center gap-1.5 text-amber-700 transition"
                        >
                          <FileText size={24} />
                          <span className="text-xs font-bold">年間予定・案内冊子</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {importMethod === "paste" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <span className="text-xs font-bold text-slate-500 block mb-1">📋 コピペエリア</span>
                      <div className="flex gap-1.5">
                        <textarea
                          value={pasteText}
                          onChange={(e) => setPasteText(e.target.value)}
                          placeholder="メールやLINEの文面をここに貼り付けてください。"
                          rows={3}
                          className="flex-1 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 bg-white resize-none outline-none focus:border-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => { if (pasteText.trim()) onScanText(pasteText.trim()); }}
                          disabled={!pasteText.trim()}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 rounded-lg flex items-center justify-center shrink-0 disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          解析
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">※貼り付けて「解析」を押すと、AIがアサイン・日付を解析してやることを作成します。</p>
                    </div>
                  )}

                  {importMethod === "pdf" && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col items-center gap-3">
                      <span className="text-xs font-bold text-slate-500 block">📄 ドキュメントファイル(PDF/画像)のアップロード</span>
                      <button
                        type="button"
                        onClick={() => triggerFileInput("image/*,.pdf,application/pdf")}
                        className="w-full py-4 bg-white border border-dashed border-indigo-300 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-50/30 transition shadow-sm"
                      >
                        <FileText size={18} />
                        ファイルを選択（PDF, PNG, JPEG）
                      </button>
                      <p className="text-[10px] text-slate-400">学校のウェブサイトなどから保存したPDFをそのまま読み込めます。</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── 選択済み・回転確認ステップ ── */}
          {pendingFile && pendingPreviewUrl && (
            <div className="space-y-3">
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-3">
                {/* プレビュー画像（CSS で回転のみ表示） */}
                <div className="flex justify-center items-center min-h-40 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingPreviewUrl}
                    alt="プレビュー"
                    style={{ transform: `rotate(${rotation}deg)`, transition: "transform 0.3s", maxHeight: "240px", maxWidth: "100%", objectFit: "contain" }}
                  />
                </div>

                {/* 撮り直しボタン */}
                <button
                  type="button"
                  onClick={handleResetPending}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow transition"
                >
                  <X size={12} />
                </button>
              </div>

              {/* 回転ボタン */}
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleRotate("left")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition"
                >
                  <RotateCcw size={14} /> 左90°
                </button>
                <span className="text-xs text-slate-400">{rotation}°</span>
                <button
                  type="button"
                  onClick={() => handleRotate("right")}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition"
                >
                  右90° <RotateCw size={14} />
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                プリントが横向き・逆さの場合は回転してから「スキャン開始」を押してください
              </p>

              {/* スキャン開始ボタン */}
              <button
                type="button"
                onClick={handleStartScan}
                disabled={isCompressing}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 transition"
              >
                {isCompressing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AIでスキャン開始
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── スキャン済み画像プレビュー ── */}
          {scannedImage && !pendingFile && (
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">スキャン画像</label>
              <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                <Image
                  src={scannedImage}
                  alt="プレビュー"
                  width={360}
                  height={240}
                  className="max-h-36 w-auto mx-auto object-contain"
                />
                <button
                  type="button"
                  onClick={onResetScan}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 shadow transition"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* ── OCR結果・タスク候補 ── */}
          {ocrTextResult && (
            <>
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5 flex items-center gap-1">
                  <Sparkles size={12} className="text-teal-500" />
                  AI抽出テキスト（編集可）
                </label>
                <textarea
                  value={ocrTextResult}
                  onChange={(event) => onChangeOcrText(event.target.value)}
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-teal-500"
                />
                <p className="text-xs text-slate-400 mt-1">
                  AIが読み取りました。内容をご確認・修正ください。
                </p>
              </div>

              <div className="border border-amber-100 bg-amber-50/30 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-amber-800 flex items-center gap-1">
                    <AlertCircle size={12} /> やること候補
                  </span>
                  <button
                    type="button"
                    onClick={onAddTodoDraft}
                    className="text-xs font-bold text-teal-700 bg-white border border-teal-100 px-2.5 py-1 rounded-lg"
                  >
                    追加
                  </button>
                </div>

                {todoDrafts.length === 0 ? (
                  <p className="text-xs text-slate-400">必要な持ち物や提出物があれば追加できます。</p>
                ) : (
                  <div className="space-y-3">
                    {todoDrafts.map((draft, index) => {
                      const isLowConfidence = draft.confidence !== undefined && draft.confidence < 0.7;
                      return (
                        <div
                          key={draft.id}
                          className={`bg-white border rounded-xl p-3 space-y-2 ${
                            isLowConfidence ? "border-amber-300" : "border-amber-100"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                              候補 {index + 1}
                              {isLowConfidence && (
                                <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1">
                                  ⚠️ 要確認
                                </span>
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() => onRemoveTodoDraft(draft.id)}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div className="flex gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => onUpdateTodoDraft(draft.id, { type: "todo" })}
                              className={`flex-1 py-1 rounded-md font-bold text-center border transition ${
                                draft.type === "todo" || !draft.type
                                  ? "bg-teal-50 border-teal-200 text-teal-700"
                                  : "bg-slate-50 border-slate-100 text-slate-400"
                              }`}
                            >
                              📄 やること
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateTodoDraft(draft.id, { type: "shopping" })}
                              className={`flex-1 py-1 rounded-md font-bold text-center border transition ${
                                draft.type === "shopping"
                                  ? "bg-amber-50 border-amber-200 text-amber-700"
                                  : "bg-slate-50 border-slate-100 text-slate-400"
                              }`}
                            >
                              🛒 買うもの
                            </button>
                          </div>
                          <input
                            type="text"
                            value={draft.task}
                            onChange={(event) => onUpdateTodoDraft(draft.id, { task: event.target.value })}
                            placeholder={draft.type === "shopping" ? "買うものの名前" : "やることの内容"}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 bg-white"
                          />
                          <div className="flex gap-1.5 flex-wrap">
                            <input
                              type="date"
                              value={draft.dueDate}
                              onChange={(event) => onUpdateTodoDraft(draft.id, { dueDate: event.target.value })}
                              className="flex-1 min-w-[90px] border border-slate-200 rounded-lg p-2 text-xs text-slate-800 bg-white"
                            />
                            <select
                              value={draft.assignedTo}
                              onChange={(event) => onUpdateTodoDraft(draft.id, { assignedTo: event.target.value as TodoAssignee })}
                              className="border border-slate-200 rounded-lg p-2 text-xs text-slate-800 bg-white"
                            >
                              <option value="共通">共通</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.name}>{m.role} {m.name}</option>
                              ))}
                            </select>
                            <select
                              value={draft.reminderAt || "1day"}
                              onChange={(event) => onUpdateTodoDraft(draft.id, { reminderAt: event.target.value as "none" | "today" | "1day" | "3day" })}
                              className="border border-slate-200 rounded-lg p-2 text-xs text-slate-800 bg-white flex-1 min-w-[80px]"
                            >
                              <option value="none">🔔 なし</option>
                              <option value="today">🔔 当日</option>
                              <option value="1day">🔔 1日前</option>
                              <option value="3day">🔔 3日前</option>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 text-sm font-bold"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!ocrTextResult}
            className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold disabled:bg-slate-200 disabled:text-slate-400"
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  );
}
