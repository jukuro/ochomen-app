"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import type { Child } from "@/lib/types";
import {
  CHARACTER_THEMES,
  type CharacterTheme,
  type ChildCharacter,
  upsertChildCharacter,
} from "@/lib/childCharacters";
import type { UserProgress } from "@/lib/userProgress";
import { saveUserProgress } from "@/lib/userProgress";

interface ChildCharacterSetupModalProps {
  open: boolean;
  child: Child | null;
  onClose: () => void;
  onSave: (progress: UserProgress) => void;
  userProgress: UserProgress;
}

export function ChildCharacterSetupModal({
  open,
  child,
  onClose,
  onSave,
  userProgress,
}: ChildCharacterSetupModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<CharacterTheme>("spirit");
  const [photoPreview, setPhotoPreview] = useState<string | undefined>();
  const [photoBase64, setPhotoBase64] = useState<string | undefined>();
  const [photoMimeType, setPhotoMimeType] = useState("image/jpeg");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ChildCharacter | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open || !child) return null;

  const handlePhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotoPreview(dataUrl);
      setPhotoBase64(dataUrl.replace(/^data:[^;]+;base64,/, ""));
      setPhotoMimeType(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/characterize-child", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: child.id,
          childName: child.name,
          theme,
          photoBase64,
          photoMimeType,
        }),
      });
      const data = (await res.json()) as { character?: ChildCharacter; error?: string };
      if (!res.ok || !data.character) {
        throw new Error(data.error || "キャラの作成に失敗しました");
      }
      setPreview({
        ...data.character,
        photoPreviewUrl: photoPreview,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!preview) return;
    const next = upsertChildCharacter(userProgress, preview);
    saveUserProgress(next);
    onSave(next);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40">
      <div
        className="w-full max-w-lg rounded-t-3xl max-h-[90dvh] overflow-y-auto animate-slide-up"
        style={{ background: "var(--color-surface)" }}
      >
        <div
          className="sticky top-0 flex items-center justify-between px-4 py-3 border-b z-10"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
            {child.name}のキャラを育てる
          </h3>
          <button type="button" onClick={onClose} className="p-2 rounded-full" aria-label="閉じる">
            <X size={20} style={{ color: "var(--color-muted)" }} />
          </button>
        </div>

        <div className="p-4 space-y-4 pb-8">
          <p className="text-xs leading-relaxed" style={{ color: "var(--color-muted)" }}>
            テーマを選んで、必要ならお子さまの写真を追加。AIが相棒キャラを考えます。スキャンするほど成長します。
          </p>

          <div>
            <p className="text-[10px] font-bold mb-2" style={{ color: "var(--color-muted)" }}>
              テーマ
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CHARACTER_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-xl border text-left transition ${
                    theme === t.id ? "ring-2 ring-[var(--color-primary)]" : ""
                  }`}
                  style={{
                    background: theme === t.id ? "var(--color-primary-light)" : "var(--color-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <span className="text-xl">{t.emoji}</span>
                  <p className="text-xs font-bold mt-1" style={{ color: "var(--color-text)" }}>
                    {t.label}
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--color-muted)" }}>
                    {t.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold mb-2" style={{ color: "var(--color-muted)" }}>
              写真（任意）
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhoto(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
            >
              <Camera size={18} />
              {photoPreview ? "写真を変更" : "写真を選ぶ"}
            </button>
            {photoPreview && (
              <img
                src={photoPreview}
                alt=""
                className="mt-2 w-20 h-20 rounded-xl object-cover border mx-auto"
                style={{ borderColor: "var(--color-border)" }}
              />
            )}
          </div>

          {preview && (
            <div
              className="rounded-xl p-4 border text-center"
              style={{ background: "var(--color-bg)", borderColor: "var(--color-border)" }}
            >
              <p className="text-4xl mb-2">{preview.stages[0]}</p>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                {preview.characterName}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
                {preview.tagline}
              </p>
              <p className="text-[10px] mt-2" style={{ color: "var(--color-muted)" }}>
                成長: {preview.stageLabels.join(" → ")}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{error}</p>}

          <div className="space-y-2">
            <button
              type="button"
              disabled={loading}
              onClick={handleGenerate}
              className="w-full app-primary-cta py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {preview ? "もう一度考える" : "キャラを生む"}
            </button>
            {preview && (
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3 rounded-xl text-sm font-bold"
                style={{ background: "var(--color-secondary)", color: "white" }}
              >
                このキャラで育てる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
