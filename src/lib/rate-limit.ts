import "server-only";

import { isIP } from "node:net";

export type RateLimitPolicy = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = Map<string, RateLimitEntry>;

const MAX_RATE_LIMIT_ENTRIES = 10_000;

const globalWithRateLimit = globalThis as typeof globalThis & {
  videoAppRateLimitStore?: RateLimitStore;
};

const store = globalWithRateLimit.videoAppRateLimitStore ?? new Map();

globalWithRateLimit.videoAppRateLimitStore = store;

function normalizeIp(value: string | null): string | null {
  if (!value) return null;

  let candidate = value.trim();
  if (!candidate) return null;

  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else if (candidate.includes(":") && candidate.includes(".") && candidate.lastIndexOf(":") > candidate.lastIndexOf(".")) {
    candidate = candidate.slice(0, candidate.lastIndexOf(":"));
  }

  return isIP(candidate) ? candidate.toLowerCase() : null;
}

function firstForwardedIp(value: string | null): string | null {
  return normalizeIp(value?.split(",", 1)[0] ?? null);
}

export function getClientIp(request: Request): string {
  const platformIp =
    normalizeIp(request.headers.get("cf-connecting-ip")) ??
    normalizeIp(request.headers.get("x-vercel-forwarded-for"));

  if (platformIp) return platformIp;

  if (process.env.TRUST_PROXY_HEADERS === "true") {
    return (
      firstForwardedIp(request.headers.get("x-forwarded-for")) ??
      normalizeIp(request.headers.get("x-real-ip")) ??
      "unknown"
    );
  }

  return "unknown";
}

function removeExpiredEntries(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

function enforceStoreBound(now: number): void {
  if (store.size < MAX_RATE_LIMIT_ENTRIES) return;

  removeExpiredEntries(now);
  while (store.size >= MAX_RATE_LIMIT_ENTRIES) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

export function checkRateLimit(
  bucket: string,
  identifier: string,
  policy: RateLimitPolicy,
  now = Date.now(),
): RateLimitResult {
  if (!Number.isInteger(policy.limit) || policy.limit < 1 || policy.windowMs < 1) {
    throw new Error("Invalid rate-limit policy.");
  }

  const key = `${bucket}:${identifier}`;
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    enforceStoreBound(now);
    entry = { count: 0, resetAt: now + policy.windowMs };
    store.set(key, entry);
  } else {
    store.delete(key);
    store.set(key, entry);
  }

  entry.count += 1;
  const allowed = entry.count <= policy.limit;

  return {
    allowed,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - entry.count),
    retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    resetAt: entry.resetAt,
  };
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed
      ? {}
      : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}

export function resetRateLimitStoreForTests(): void {
  if (process.env.NODE_ENV === "test") store.clear();
}
