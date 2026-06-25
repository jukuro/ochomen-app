"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, Loader2, Sparkles, Trash2, X, CheckCircle2, AlertCircle, Clock, Plus, RotateCw } from "lucide-react";
import type { Child, CaptureDoc, CapturePage, EntrySection, EntryScope } from "@/lib/types";
import { ENTRY_SCOPE_OPTIONS } from "@/lib/scopeOptions";
import { OcrSkeleton } from "@/components/OcrSkeleton";
import { FullScreenScanCapture } from "@/components/FullScreenScanCapture";
import { processScanFile } from "@/lib/documentTrim";
import { createLocalId } from "@/lib/ids";
import type { UserProgress } from "@/lib/userProgress";

interface BatchScanModalProps {
  open: boolean;
  userProgress: UserProgress;
  childrenProfiles: Child[];
  categories: string[];
  targetChildIds: string[];
  docs: CaptureDoc[];
  isProcessing: boolean;
  confirmMode: boolean;
  docScope: EntryScope;
  onDocScopeChange: (scope: EntryScope) => void;
  onToggleTargetChild: (childId: string) => void;
  onAddNewDoc: (pages: CapturePage[]) => void;
  onAddPageToDoc: (docId: string, page: CapturePage) => void;
  onRemoveDoc: (docId: string) => void;
  onRemovePageFromDoc: (docId: string, pageId: string) => void;
  onRotatePage: (docId: string, pageId: string) => void;
  onUpdateDocMeta: (docId: string, changes: Partial<Pick<CaptureDoc, "title" | "category" | "sections">>) => void;
  onClose: () => void;
  onProcess: (autoCommit: boolean) => void;
  onCommitConfirmed: () => void;
}

export function BatchScanModal({
  open,
  userProgress,
  childrenProfiles,
  categories,
  targetChildIds,
  docs,
  isProcessing,
  confirmMode,
  docScope,
  onDocScopeChange,
  onToggleTargetChild,
  onAddNewDoc,
  onAddPageToDoc,
  onRemoveDoc,
  onRemovePageFromDoc,
  onRotatePage,
  onUpdateDocMeta,
  onClose,
  onProcess,
  onCommitConfirmed,
}: BatchScanModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSectionExpand = useCallback((key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  // 撮影対象：null = 新しい書類、docId = その書類にページ追加
  const targetDocRef = useRef<string | null>(null);
  // 拡大プレビュー中のページ
  const [previewPage, setPreviewPage] = useState<{ docId: string; pageId: string } | null>(null);
  const [phase, setPhase] = useState<"capture" | "review">("capture");

  useEffect(() => {
    if (open) setPhase("capture");
  }, [open]);

  if (!open) return null;

  const previewing = previewPage
    ? docs.find((d) => d.id === previewPage.docId)?.pages.find((p) => p.id === previewPage.pageId)
    : null;
  const previewDoc = previewPage ? docs.find((d) => d.id === previewPage.docId) : null;
  const previewEditable = previewDoc?.status === "pending" && !isProcessing;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setIsCompressing(true);
    try {
      const pages: CapturePage[] = [];
      for (const file of files) {
        const processed = await processScanFile(file);
        pages.push({ id: createLocalId("page"), ...processed });
      }
      if (targetDocRef.current) {
        // 既存書類にページ追加（裏面など）
        pages.forEach((p) => onAddPageToDoc(targetDocRef.current!, p));
      } else {
        // 新しい書類として（複数枚選んだ場合は別々の書類に）
        pages.forEach((p) => onAddNewDoc([p]));
      }
    } catch {
      alert("画像の処理に失敗しました。別の画像をお試しください。");
    } finally {
      setIsCompressing(false);
      targetDocRef.current = null;
    }
  };

  const triggerCapture = (docId: string | null) => {
    targetDocRef.current = docId;
    fileInputRef.current?.click();
  };

  const pendingCount = docs.filter((d) => d.status === "pending").length;
  const errorCount = docs.filter((d) => d.status === "error").length;
  const doneCount = docs.filter((d) => d.status === "done").length;
  const showConfirmList = confirmMode && doneCount > 0;
  const readyToProcess = pendingCount + errorCount;
  const allCapturedPages = docs.flatMap((d) => d.pages);

  if (phase === "capture") {
    return (
      <FullScreenScanCapture
        userProgress={userProgress}
        capturedPages={allCapturedPages}
        onAddPages={(pages) => {
          if (targetDocRef.current) {
            pages.forEach((p) => onAddPageToDoc(targetDocRef.current!, p));
            targetDocRef.current = null;
          } else {
            pages.forEach((p) => onAddNewDoc([p]));
          }
        }}
        onDone={() => setPhase("review")}
        onCancel={onClose}
      />
    );
  }

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[92%] overflow-y-auto animate-slide-up text-slate-800">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
            📸 {showConfirmList ? "内容を確認" : "スキャン"}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 p-1">
            <X size={20} />
          </button>
        </div>

        {!showConfirmList && (() => {
          const errorDocs = docs.filter((d) => d.status === "error");
          if (errorDocs.length > 0 && !isProcessing) {
            return (
              <p className="text-xs text-red-600 leading-relaxed bg-red-50 border border-red-200 rounded-xl p-3">
                ⚠️ {errorDocs.length}件の読み取りに失敗しました。ゴミ箱アイコンで削除してから撮り直してください。
              </p>
            );
          }
          return (
            <p className="text-xs text-slate-500 leading-relaxed bg-teal-50/60 border border-teal-100 rounded-xl p-3">
              書類をどんどん撮影してください。AIを待たずに次へ進めます。両面プリントは「裏面・ページを追加」で1つの書類にまとめられます。
            </p>
          );
        })()}

        {/* 書類の種類 + 対象メンバー */}
        {!showConfirmList && (
          <div className="space-y-3">
            {/* 書類の種類（スコープ） */}
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">書類のジャンル</label>
              <div className="grid grid-cols-3 gap-1.5">
                {ENTRY_SCOPE_OPTIONS.map(({ key, label, icon, desc }) => {
                  const isSelected = docScope === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onDocScopeChange(key)}
                      className={`flex flex-col items-center py-2 px-1 rounded-xl border text-center transition ${
                        isSelected
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-500"
                      }`}
                    >
                      <span className="text-lg">{icon}</span>
                      <span className="text-[10px] font-bold mt-0.5">{label}</span>
                      {desc && (
                        <span className={`text-[9px] mt-0.5 ${isSelected ? "text-teal-100" : "text-slate-400"}`}>{desc}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {docScope === "school" && childrenProfiles.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">対象の保育園・学校</label>
                <div className="flex gap-2 flex-wrap">
                  {childrenProfiles.map((child) => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => onToggleTargetChild(child.id)}
                      className={`px-3 py-2 rounded-full text-xs font-bold transition ${
                        targetChildIds.includes(child.id) ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {child.avatar} {child.name.split(" ")[0]}
                    </button>
                  ))}
                  {docScope === "school" && (
                    <p className="text-[10px] text-slate-400 w-full">※ 選ばない場合は全員に適用されます</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!showConfirmList && isProcessing && (
          <OcrSkeleton message="プリントを読み解いています" compact userProgress={userProgress} mascotAnim="eat" />
        )}

        {/* 撮影ボタン（新しい書類） */}
        {!showConfirmList && !isProcessing && (
          <button
            type="button"
            onClick={() => triggerCapture(null)}
            disabled={isCompressing || isProcessing}
            className="w-full py-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-40 app-primary-cta"
          >
            {isCompressing ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
            {docs.length === 0 ? "撮影する" : "＋ 別の書類を撮る"}
          </button>
        )}

        {/* 書類リスト */}
        {docs.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-400">
              {showConfirmList ? `${doneCount}件の書類` : `撮影した書類（${docs.length}件）`}
            </p>
            {docs.map((doc, idx) => (
              <div key={doc.id} className="border border-slate-200 rounded-2xl p-3 space-y-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                    書類 {idx + 1}
                    {doc.pages.length > 1 && (
                      <span className="bg-slate-200 text-slate-600 text-[9px] px-1.5 py-0.5 rounded-full">
                        {doc.pages.length}ページ
                      </span>
                    )}
                    {doc.status === "processing" && (
                      <span className="flex items-center gap-1" style={{ color: "var(--color-primary)" }}>読み解き中…</span>
                    )}
                    {doc.status === "done" && (
                      <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle2 size={11} /> 完了</span>
                    )}
                    {doc.status === "error" && (
                      <span className="text-red-500 flex items-center gap-0.5"><AlertCircle size={11} /> 読み取り失敗</span>
                    )}
                    {doc.status === "pending" && (
                      <span className="text-slate-400 flex items-center gap-0.5"><Clock size={11} /> 待機</span>
                    )}
                  </span>
                  {(doc.status === "pending" || doc.status === "error") && !isProcessing && (
                    <button type="button" onClick={() => onRemoveDoc(doc.id)} className="text-slate-400 hover:text-red-500 p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* ページサムネ */}
                <div className="flex gap-2 flex-wrap">
                  {doc.pages.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreviewPage({ docId: doc.id, pageId: p.id })}
                      className="relative w-20 h-24 rounded-lg overflow-hidden border border-slate-200 bg-white active:scale-95 transition"
                      title="タップで拡大・回転"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.previewUrl} alt="ページ" className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/45 text-white text-[8px] py-0.5 text-center">
                        タップで拡大
                      </span>
                    </button>
                  ))}
                  {/* ページ追加（裏面） */}
                  {doc.status === "pending" && !isProcessing && (
                    <button
                      type="button"
                      onClick={() => triggerCapture(doc.id)}
                      className="w-20 h-24 rounded-lg border-2 border-dashed border-teal-300 text-teal-600 flex flex-col items-center justify-center gap-0.5 active:scale-95 transition"
                    >
                      <Plus size={16} />
                      <span className="text-[8px] font-bold leading-tight text-center">裏面・<br />ページ</span>
                    </button>
                  )}
                </div>

                {/* 確認モード：タイトル・カテゴリー編集 */}
                {showConfirmList && doc.status === "done" && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={doc.title || ""}
                      onChange={(e) => onUpdateDocMeta(doc.id, { title: e.target.value })}
                      placeholder="書類タイトル"
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-800 bg-white outline-none focus:border-teal-400"
                    />
                    <select
                      value={doc.category || categories[0] || ""}
                      onChange={(e) => onUpdateDocMeta(doc.id, { category: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg p-2 text-sm text-slate-800 bg-white outline-none focus:border-teal-400"
                    >
                      {Array.from(new Set([...(doc.category ? [doc.category] : []), ...categories])).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* お帳面セクション確認・修正 UI */}
                    {doc.sections && doc.sections.length > 0 && (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 space-y-3">
                        <p className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                          📖 お帳面モード — 先生と保護者の区別を確認
                        </p>
                        {new Set(doc.sections.map((s) => s.date ?? "日付不明")).size > 1 && (
                          <p className="text-[10px] text-indigo-600 bg-white/70 rounded-lg px-2 py-1.5">
                            複数日が含まれています。登録時に日付ごとに分けて保存されます。
                          </p>
                        )}
                        {/* 日付ごとにグループ化して表示 */}
                        {(() => {
                          const dateGroups: { date: string; sections: { sec: EntrySection; si: number }[] }[] = [];
                          doc.sections.forEach((sec, si) => {
                            const d = sec.date ?? "日付不明";
                            const g = dateGroups.find((g) => g.date === d);
                            if (g) g.sections.push({ sec, si });
                            else dateGroups.push({ date: d, sections: [{ sec, si }] });
                          });
                          return dateGroups.map((group) => (
                            <div key={group.date} className="space-y-1.5">
                              {/* 日付ヘッダー */}
                              <div className="text-[11px] font-bold text-indigo-600 border-b border-indigo-100 pb-0.5">
                                {group.date !== "日付不明"
                                  ? `${Number(group.date.slice(5, 7))}月${Number(group.date.slice(8, 10))}日`
                                  : "日付不明"}
                              </div>
                              {group.sections.map(({ sec, si }) => (
                                <div key={si} className={`rounded-lg p-2.5 border text-xs space-y-1 ${sec.author === "teacher" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`font-bold ${sec.author === "teacher" ? "text-emerald-700" : "text-amber-700"}`}>
                                      {sec.author === "teacher" ? "👩‍🏫 先生から" : "🏠 家庭から"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated: EntrySection[] = doc.sections!.map((s, i) =>
                                          i === si ? { ...s, author: s.author === "teacher" ? "parent" : "teacher" } : s
                                        );
                                        onUpdateDocMeta(doc.id, { sections: updated });
                                      }}
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${sec.author === "teacher" ? "border-emerald-300 text-emerald-700 hover:bg-emerald-100" : "border-amber-300 text-amber-700 hover:bg-amber-100"}`}
                                    >
                                      入れ替え
                                    </button>
                                  </div>
                                  {(() => {
                                    const key = `${doc.id}-${si}`;
                                    const isExp = !!expandedSections[key];
                                    const needsToggle = sec.text.length > 120 || sec.text.split("\n").length > 3;
                                    return (
                                      <>
                                        <p className={`text-slate-600 leading-relaxed whitespace-pre-wrap ${!isExp && needsToggle ? "line-clamp-3" : ""}`}>{sec.text}</p>
                                        {needsToggle && (
                                          <button type="button" onClick={() => toggleSectionExpand(key)}
                                            className="text-[10px] font-bold text-indigo-600 mt-0.5">
                                            {isExp ? "▲ 折りたたむ" : "▼ 全文を表示"}
                                          </button>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              ))}
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {doc.todoDrafts && doc.todoDrafts.filter((d) => d.task.trim()).length > 0 && (
                      <p className="text-[11px] text-teal-700 font-bold">
                        やること {doc.todoDrafts.filter((d) => d.task.trim()).length}件も登録されます
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* アクション */}
        {!showConfirmList ? (
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => onProcess(true)}
              disabled={readyToProcess === 0 || isProcessing}
              className="w-full py-3 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 app-primary-cta"
            >
              {isProcessing
                ? <>読み解いています…</>
                : errorCount > 0 && pendingCount === 0
                  ? <><RotateCw size={15} /> 失敗分を再試行（{errorCount}件）</>
                  : <><Sparkles size={15} /> おまかせで登録（{readyToProcess}件）</>
              }
            </button>
            <button
              type="button"
              onClick={() => onProcess(false)}
              disabled={readyToProcess === 0 || isProcessing}
              className="w-full py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-sm font-bold disabled:opacity-40"
            >
              1件ずつ確認して登録
            </button>
          </div>
        ) : (
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 text-sm font-bold">
              キャンセル
            </button>
            <button
              type="button"
              onClick={onCommitConfirmed}
              className="flex-1 py-3 rounded-xl bg-teal-600 text-white text-sm font-bold flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={15} /> {doneCount}件を登録
            </button>
          </div>
        )}
      </div>

      {/* 拡大プレビュー（回転） */}
      {previewing && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-white text-sm font-bold">書類を確認</span>
            <button type="button" onClick={() => setPreviewPage(null)} className="text-white p-1.5 bg-white/20 rounded-full">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-auto flex items-center justify-center p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewing.previewUrl} alt="プレビュー" className="max-w-full max-h-full object-contain" />
          </div>
          {previewEditable && (
            <div className="px-4 py-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onRotatePage(previewPage!.docId, previewPage!.pageId)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-slate-800 text-sm font-bold active:scale-95 transition shadow"
              >
                <RotateCw size={18} /> 90°回転する
              </button>
            </div>
          )}
          <p className="text-white/50 text-[11px] text-center pb-2">向きが正しいか確認して、必要なら回転してください</p>
        </div>
      )}
    </div>
  );
}
