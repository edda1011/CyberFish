import { describe, expect, it } from "vitest";
import { consumeRateLimit, rateLimitHeaders } from "../lib/rate-limit";

let scopeNumber = 0;

function policy(limit = 2, windowMs = 1_000) {
  scopeNumber += 1;
  return { scope: `test-${scopeNumber}`, limit, windowMs };
}

function request(address = "203.0.113.10") {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": address },
  });
}

describe("in-memory rate limiting", () => {
  it("counts requests and blocks calls beyond the quota", () => {
    const testPolicy = policy();
    const first = consumeRateLimit(request(), testPolicy, 1_000);
    const second = consumeRateLimit(request(), testPolicy, 1_100);
    const blocked = consumeRateLimit(request(), testPolicy, 1_200);

    expect(first).toMatchObject({ allowed: true, remaining: 1 });
    expect(second).toMatchObject({ allowed: true, remaining: 0 });
    expect(blocked).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 1 });
  });

  it("resets the quota after the window expires", () => {
    const testPolicy = policy(1, 500);
    expect(consumeRateLimit(request(), testPolicy, 1_000).allowed).toBe(true);
    expect(consumeRateLimit(request(), testPolicy, 1_100).allowed).toBe(false);

    const reset = consumeRateLimit(request(), testPolicy, 1_500);
    expect(reset).toMatchObject({ allowed: true, remaining: 0, resetAt: 2_000 });
  });

  it("keeps general and AI quotas independent", () => {
    const general = policy(1);
    const ai = policy(1);
    const client = request();

    expect(consumeRateLimit(client, general, 1_000).allowed).toBe(true);
    expect(consumeRateLimit(client, ai, 1_000).allowed).toBe(true);
    expect(consumeRateLimit(client, general, 1_100).allowed).toBe(false);
    expect(consumeRateLimit(client, ai, 1_100).allowed).toBe(false);
  });

  it("returns standard quota headers and a retry delay", () => {
    const result = {
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: 120_000,
      retryAfterSeconds: 60,
    };

    expect(rateLimitHeaders(result)).toEqual({
      "RateLimit-Limit": "5",
      "RateLimit-Remaining": "0",
      "RateLimit-Reset": "120",
      "Retry-After": "60",
    });
  });
});
