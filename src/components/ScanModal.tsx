"use client";

import Image from "next/image";
import {
  AlertCircle,
  Camera,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import type { Child, TodoAssignee, TodoDraft, Member } from "@/lib/types";

interface ScanModalProps {
  open: boolean;
  childrenProfiles: Child[];
  categories: string[];
  members: Member[];
  targetChildIds: string[];
  selectedCategory: string;
  scannedImage: string | null;
  ocrTextResult: string;
  isScanning: boolean;
  todoDrafts: TodoDraft[];
  onClose: () => void;
  onResetScan: () => void;
  onToggleTargetChild: (childId: string) => void;
  onSelectCategory: (category: string) => void;
  onScanNote: () => void;
  onScanYearlyPlan: () => void;
  onChangeOcrText: (text: string) => void;
  onAddTodoDraft: () => void;
  onUpdateTodoDraft: (
    draftId: string,
    changes: Partial<Pick<TodoDraft, "task" | "dueDate" | "assignedTo" | "type" | "reminderAt">>
  ) => void;
  onRemoveTodoDraft: (draftId: string) => void;
  onSubmit: () => void;
}

export function ScanModal({
  open,
  childrenProfiles,
  categories,
  members,
  targetChildIds,
  selectedCategory,
  scannedImage,
  ocrTextResult,
  isScanning,
  todoDrafts,
  onClose,
  onResetScan,
  onToggleTargetChild,
  onSelectCategory,
  onScanNote,
  onScanYearlyPlan,
  onChangeOcrText,
  onAddTodoDraft,
  onUpdateTodoDraft,
  onRemoveTodoDraft,
  onSubmit,
}: ScanModalProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-black/50 flex items-end z-50">
      <div className="bg-white w-full rounded-t-3xl p-5 space-y-4 max-h-[90%] overflow-y-auto animate-slide-up">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-800">新規スキャン</h3>
          <button type="button" onClick={onClose} className="text-slate-400 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">
              対象のお子さま
            </label>
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

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">
              カテゴリー
            </label>
            <select
              value={selectedCategory}
              onChange={(event) => onSelectCategory(event.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm text-slate-800 outline-none focus:border-teal-500"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {!ocrTextResult && (
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                写真を撮影
              </label>
              {isScanning ? (
                <div className="border-2 border-dashed border-teal-300 bg-teal-50 rounded-xl p-8 flex flex-col items-center gap-2">
                  <Loader2 className="animate-spin text-teal-600" />
                  <span className="text-sm text-teal-600 font-bold">
                    AIが読み取り中...
                  </span>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onScanNote}
                    className="flex-1 border-2 border-dashed border-teal-200 bg-teal-50/50 rounded-xl p-5 flex flex-col items-center gap-1.5 text-teal-600 hover:bg-teal-50 transition"
                  >
                    <Camera size={22} />
                    <span className="text-xs font-bold">お帳面</span>
                  </button>
                  <button
                    type="button"
                    onClick={onScanYearlyPlan}
                    className="flex-1 border-2 border-dashed border-amber-200 bg-amber-50/50 rounded-xl p-5 flex flex-col items-center gap-1.5 text-amber-700 hover:bg-amber-50 transition"
                  >
                    <FileText size={22} />
                    <span className="text-xs font-bold">年間予定</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {scannedImage && (
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5">
                スキャン画像
              </label>
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
                  AIが読み取りました。内容をご確認ください。
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
                  <p className="text-xs text-slate-400">
                    必要な持ち物や提出物があれば追加できます。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {todoDrafts.map((draft, index) => (
                      <div
                        key={draft.id}
                        className="bg-white border border-amber-100 rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-400">
                            候補 {index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveTodoDraft(draft.id)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {/* 種別選択 */}
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
                          onChange={(event) =>
                            onUpdateTodoDraft(draft.id, { task: event.target.value })
                          }
                          placeholder={draft.type === "shopping" ? "買うものの名前" : "やることの内容"}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm text-slate-800 bg-white"
                        />
                        <div className="flex gap-1.5 flex-wrap">
                          <input
                            type="date"
                            value={draft.dueDate}
                            onChange={(event) =>
                                onUpdateTodoDraft(draft.id, { dueDate: event.target.value })
                            }
                            className="flex-1 min-w-[90px] border border-slate-200 rounded-lg p-2 text-xs text-slate-800 bg-white"
                          />
                          <select
                            value={draft.assignedTo}
                            onChange={(event) =>
                              onUpdateTodoDraft(draft.id, {
                                assignedTo: event.target.value as TodoAssignee,
                              })
                            }
                            className="border border-slate-200 rounded-lg p-2 text-xs text-slate-800 bg-white"
                          >
                            <option value="共通">共通</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.name}>
                                {m.role} {m.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={draft.reminderAt || "1day"}
                            onChange={(event) =>
                              onUpdateTodoDraft(draft.id, {
                                reminderAt: event.target.value as any,
                              })
                            }
                            className="border border-slate-200 rounded-lg p-2 text-xs text-slate-800 bg-white flex-1 min-w-[80px]"
                          >
                            <option value="none">🔔 なし</option>
                            <option value="today">🔔 当日</option>
                            <option value="1day">🔔 1日前</option>
                            <option value="3day">🔔 3日前</option>
                          </select>
                        </div>
                      </div>
                    ))}
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
