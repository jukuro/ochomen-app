"use client";

import { hardReload, hardReloadWithSwReset } from "@/lib/hardReload";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "sans-serif", background: "#faf8f5" }}>
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            ページを読み込めませんでした
          </p>
          <p style={{ fontSize: 14, color: "#64748b", maxWidth: 280 }}>
            アプリの更新直後などに一時的に起きることがあります。
          </p>
          <button
            type="button"
            onClick={() => hardReload()}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "none",
              background: "#0d9488",
              color: "#fff",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            再読み込み
          </button>
          <button
            type="button"
            onClick={() => void hardReloadWithSwReset()}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px dashed #cbd5e1",
              background: "#fff",
              color: "#64748b",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            キャッシュをクリアして再起動
          </button>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "10px 20px",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#334155",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            やり直す
          </button>
        </div>
      </body>
    </html>
  );
}
