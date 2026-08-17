import { createHash, randomBytes } from "node:crypto";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitGlobals = typeof globalThis & {
  cyberFishRateLimits?: Map<string, RateLimitEntry>;
  cyberFishRateLimitSalt?: string;
  cyberFishRateLimitLastCleanup?: number;
};

export type RateLimitPolicy = {
  scope: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

export const ANALYSIS_RATE_LIMIT: RateLimitPolicy = {
  scope: "analysis",
  limit: 30,
  windowMs: 10 * 60 * 1000,
};

export const AI_EMAIL_RATE_LIMIT: RateLimitPolicy = {
  scope: "email-ai",
  limit: 5,
  windowMs: 10 * 60 * 1000,
};

const MAX_ENTRIES = 10_000;
const CLEANUP_INTERVAL_MS = 60_000;
const globals = globalThis as RateLimitGlobals;

const entries = globals.cyberFishRateLimits ?? new Map<string, RateLimitEntry>();
globals.cyberFishRateLimits = entries;

const salt = globals.cyberFishRateLimitSalt ?? randomBytes(32).toString("hex");
globals.cyberFishRateLimitSalt = salt;

function clientAddress(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-real-ip")
    ?? forwarded
    ?? "unknown-client";

  return address.slice(0, 128);
}

function anonymousClientKey(request: Request, scope: string) {
  return `${scope}:${createHash("sha256").update(`${salt}:${clientAddress(request)}`).digest("hex")}`;
}

function cleanupExpiredEntries(now: number) {
  const lastCleanup = globals.cyberFishRateLimitLastCleanup ?? 0;
  if (now - lastCleanup < CLEANUP_INTERVAL_MS && entries.size < MAX_ENTRIES) return;

  for (const [key, entry] of entries) {
    if (entry.resetAt <= now) entries.delete(key);
  }

  while (entries.size >= MAX_ENTRIES) {
    const oldestKey = entries.keys().next().value;
    if (typeof oldestKey !== "string") break;
    entries.delete(oldestKey);
  }

  globals.cyberFishRateLimitLastCleanup = now;
}

export function consumeRateLimit(
  request: Request,
  policy: RateLimitPolicy,
  now = Date.now(),
): RateLimitResult {
  cleanupExpiredEntries(now);

  const key = anonymousClientKey(request, policy.scope);
  const existing = entries.get(key);
  const entry = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + policy.windowMs }
    : existing;

  if (entry.count >= policy.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return {
      allowed: false,
      limit: policy.limit,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSeconds,
    };
  }

  entry.count += 1;
  entries.set(key, entry);

  return {
    allowed: true,
    limit: policy.limit,
    remaining: policy.limit - entry.count,
    resetAt: entry.resetAt,
    retryAfterSeconds: 0,
  };
}

export function rateLimitHeaders(result: RateLimitResult, prefix = "RateLimit") {
  const headers: Record<string, string> = {
    [`${prefix}-Limit`]: String(result.limit),
    [`${prefix}-Remaining`]: String(result.remaining),
    [`${prefix}-Reset`]: String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) headers["Retry-After"] = String(result.retryAfterSeconds);
  return headers;
}
