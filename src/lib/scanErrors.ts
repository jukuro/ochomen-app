/** スキャン API の error コード → ユーザー向けメッセージ */
export function getScanErrorMessage(code: string | undefined | null): string {
  switch (code) {
    case "API_KEY_MISSING":
      return "AI読み取りの設定（GEMINI_API_KEY）が未設定です。管理者が Vercel または .env.local に API キーを追加してください。";
    case "UNAUTHORIZED":
      return "アプリ認証エラーです（APP_INTERNAL_KEY と NEXT_PUBLIC_APP_KEY の不一致）。再デプロイが必要な場合があります。";
    case "RATE_LIMIT":
      return "AIが混み合っています。少し待ってから再度お試しください。";
    case "QUOTA_EXHAUSTED":
      return "Gemini API の無料枠上限に達しました。翌週のリセットまでお待ちいただくか、API キーを更新してください。";
    case "AUTH_ERROR":
      return "Gemini API の認証エラーです。API キーが無効または期限切れの可能性があります。";
    default:
      return "読み取りに失敗しました。通信状況を確認して再度お試しください。";
  }
}

export function isScanErrorRetryable(code: string | undefined | null): boolean {
  return code !== "API_KEY_MISSING" && code !== "UNAUTHORIZED" && code !== "AUTH_ERROR";
}
