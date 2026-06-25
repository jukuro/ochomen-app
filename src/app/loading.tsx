export default function Loading() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3"
      style={{ height: "100dvh", background: "var(--color-bg, #faf8f5)" }}
    >
      <div
        className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin"
        aria-hidden
      />
      <p className="text-sm text-slate-500">お帳面を読み込んでいます…</p>
    </div>
  );
}
