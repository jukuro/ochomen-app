"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 p-6 text-center"
      style={{ minHeight: "100dvh", background: "var(--color-bg, #fff)" }}
    >
      <p className="text-lg font-bold text-slate-800">ページを読み込めませんでした</p>
      <p className="text-sm text-slate-500 max-w-xs">
        通信状況やアプリ更新のタイミングで起きることがあります。再読み込みをお試しください。
      </p>
      {process.env.NODE_ENV === "development" && (
        <p className="text-xs text-red-500 break-all max-w-sm">{error.message}</p>
      )}
      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold"
        >
          再読み込み
        </button>
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold bg-white"
        >
          やり直す
        </button>
      </div>
    </div>
  );
}
