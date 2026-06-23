"use client";

import { useEffect, useState } from "react";
import { BirthDatePicker } from "@/components/BirthDatePicker";
import { X } from "lucide-react";
import type { Child } from "@/lib/types";

interface ChildProfileEditSheetProps {
  child: Child | null;
  onClose: () => void;
  onSave: (childId: string, patch: Pick<Child, "birthDate" | "profileNote">) => void;
}

export function ChildProfileEditSheet({ child, onClose, onSave }: ChildProfileEditSheetProps) {
  const [birthDate, setBirthDate] = useState("");
  const [profileNote, setProfileNote] = useState("");

  useEffect(() => {
    if (child) {
      setBirthDate(child.birthDate ?? "");
      setProfileNote(child.profileNote ?? "");
    }
  }, [child]);

  if (!child) return null;

  const firstName = child.name.split(" ")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl"
        style={{ background: "var(--color-surface)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="text-sm font-bold">
            {child.avatar} {firstName}のプロフィール
          </span>
          <button type="button" onClick={onClose} aria-label="閉じる" className="p-2 rounded-full hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold block" style={{ color: "var(--color-muted)" }}>
              生年月日
            </label>
            <BirthDatePicker value={birthDate} onChange={setBirthDate} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold block" style={{ color: "var(--color-muted)" }}>
              プロフィールメモ
            </label>
            <textarea
              value={profileNote}
              onChange={(e) => setProfileNote(e.target.value)}
              rows={3}
              placeholder="好きなもの、性格、最近の様子など"
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-[var(--color-primary)] resize-none"
              style={{ borderColor: "var(--color-border)" }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              onSave(child.id, {
                birthDate: birthDate.trim() || undefined,
                profileNote: profileNote.trim() || undefined,
              });
              onClose();
            }}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: "var(--color-primary)" }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
