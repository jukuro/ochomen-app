import { NextResponse } from "next/server";

/** 不正な直接呼び出し防止（APP_INTERNAL_KEY / x-app-key） */
export function verifyAppInternalKey(request: Request): NextResponse | null {
  const requiredKey = process.env.APP_INTERNAL_KEY;
  const clientKey = request.headers.get("x-app-key") ?? "";

  if (process.env.NODE_ENV === "production") {
    if (!requiredKey) {
      return NextResponse.json({ error: "SERVER_MISCONFIGURED" }, { status: 503 });
    }
    if (clientKey !== requiredKey) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    return null;
  }

  if (requiredKey && clientKey !== requiredKey) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return null;
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX = 30;
const RATE_WINDOW_MS = 60_000;

/** Gemini 等コストのかかる API 向けの簡易レート制限（IP 単位） */
export function checkRateLimit(request: Request, routeId: string): NextResponse | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `${routeId}:${ip}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    rateLimitStore.set(key, entry);
  }
  entry.count += 1;

  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json({ error: "RATE_LIMIT" }, { status: 429 });
  }
  return null;
}

export function guardApiRequest(
  request: Request,
  routeId: string,
  options?: { rateLimit?: boolean }
): NextResponse | null {
  const authError = verifyAppInternalKey(request);
  if (authError) return authError;
  if (options?.rateLimit !== false) {
    return checkRateLimit(request, routeId);
  }
  return null;
}
