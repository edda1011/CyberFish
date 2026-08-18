import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSecurityLogger } from "../lib/security-log";

beforeEach(() => {
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function parseLoggedEvent(spy: ReturnType<typeof vi.spyOn>) {
  expect(spy).toHaveBeenCalledOnce();
  const line = String(spy.mock.calls[0][0]);
  return { line, event: JSON.parse(line) as Record<string, unknown> };
}

describe("privacy-safe security logs", () => {
  it("writes completed events as valid single-line JSON", () => {
    const log = createSecurityLogger("email");
    log({ outcome: "completed", status: 200, aiRequested: false, aiStatus: "not_requested" });

    const { line, event } = parseLoggedEvent(vi.mocked(console.info));
    expect(line).not.toContain("\n");
    expect(event).toMatchObject({
      service: "cyberfish",
      endpoint: "email",
      outcome: "completed",
      status: 200,
      aiRequested: false,
      aiStatus: "not_requested",
    });
    expect(event.timestamp).toEqual(expect.any(String));
    expect(event.durationMs).toEqual(expect.any(Number));
  });

  it("uses warning output for rate limits and provider failures", () => {
    createSecurityLogger("url")({ outcome: "rate_limited", status: 429, errorCode: "RATE_LIMITED" });
    createSecurityLogger("email")({
      outcome: "provider_unavailable",
      status: 200,
      aiRequested: true,
      aiStatus: "timeout",
    });

    expect(console.warn).toHaveBeenCalledTimes(2);
    expect(console.info).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("uses error output only for unexpected errors", () => {
    createSecurityLogger("url")({ outcome: "unexpected_error", status: 500, errorCode: "UNEXPECTED_ERROR" });

    const { event } = parseLoggedEvent(vi.mocked(console.error));
    expect(event.outcome).toBe("unexpected_error");
    expect(event.status).toBe(500);
  });

  it("contains only allowlisted operational fields and no user identifiers", () => {
    createSecurityLogger("url")({
      outcome: "completed",
      status: 200,
      threatIntelligenceStatus: "unavailable",
      domainRegistrationStatus: "found",
    });

    const { line, event } = parseLoggedEvent(vi.mocked(console.info));
    expect(Object.keys(event).sort()).toEqual([
      "domainRegistrationStatus",
      "durationMs",
      "endpoint",
      "outcome",
      "service",
      "status",
      "threatIntelligenceStatus",
      "timestamp",
    ]);
    for (const forbidden of ["url", "hostname", "email", "content", "ip", "hash", "apiKey", "errorMessage"]) {
      expect(event).not.toHaveProperty(forbidden);
    }
    expect(line).not.toContain("PRIVATE-MARKER-DO-NOT-LOG");
  });
});
