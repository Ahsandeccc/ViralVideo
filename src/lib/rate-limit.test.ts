import { beforeEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  getClientIp,
  rateLimitHeaders,
  resetRateLimitStoreForTests,
} from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimitStoreForTests();
  delete process.env.TRUST_PROXY_HEADERS;
});

describe("rate limiting", () => {
  it("blocks requests over the limit and resets after the window", () => {
    const policy = { limit: 2, windowMs: 1_000 };

    expect(checkRateLimit("test", "client", policy, 0).allowed).toBe(true);
    expect(checkRateLimit("test", "client", policy, 100).allowed).toBe(true);

    const blocked = checkRateLimit("test", "client", policy, 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(rateLimitHeaders(blocked)).toMatchObject({
      "RateLimit-Limit": "2",
      "Retry-After": "1",
    });

    expect(checkRateLimit("test", "client", policy, 1_001).allowed).toBe(true);
  });

  it("keeps buckets independent", () => {
    const policy = { limit: 1, windowMs: 1_000 };
    expect(checkRateLimit("login", "one", policy, 0).allowed).toBe(true);
    expect(checkRateLimit("login", "two", policy, 0).allowed).toBe(true);
    expect(checkRateLimit("videos", "one", policy, 0).allowed).toBe(true);
  });
});

describe("client IP extraction", () => {
  it("trusts known platform headers and rejects spoofable forwarding headers by default", () => {
    const platformRequest = new Request("https://example.com", {
      headers: { "cf-connecting-ip": "203.0.113.10" },
    });
    expect(getClientIp(platformRequest)).toBe("203.0.113.10");

    const spoofedRequest = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.11" },
    });
    expect(getClientIp(spoofedRequest)).toBe("unknown");
  });

  it("uses the first valid forwarding address only when explicitly configured", () => {
    process.env.TRUST_PROXY_HEADERS = "true";
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.12, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.12");
  });
});
