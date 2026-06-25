/** クライアント → 自前 API 呼び出し時の共通ヘッダー */
export function appApiHeaders(extra?: HeadersInit): HeadersInit {
  const key = process.env.NEXT_PUBLIC_APP_KEY ?? "";
  return {
    ...(extra ?? {}),
    ...(key ? { "x-app-key": key } : {}),
  };
}

export function appApiJsonHeaders(): HeadersInit {
  return appApiHeaders({ "Content-Type": "application/json" });
}
