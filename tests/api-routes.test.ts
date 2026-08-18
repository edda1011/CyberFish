import { beforeEach, describe, expect, it, vi } from "vitest";

const providerMocks = vi.hoisted(() => ({
  checkUrl: vi.fn(),
  checkDomain: vi.fn(),
  checkHostname: vi.fn(),
  analyzeEmail: vi.fn(),
}));

vi.mock("../lib/threat-intelligence", () => ({
  threatIntelligence: { checkUrl: providerMocks.checkUrl },
}));

vi.mock("../lib/domain-registration", () => ({
  domainRegistration: { checkDomain: providerMocks.checkDomain },
}));

vi.mock("../lib/dns-safety", () => ({
  dnsSafety: { checkHostname: providerMocks.checkHostname },
}));

vi.mock("../lib/gemini-email", () => ({
  analyzeEmailWithGemini: providerMocks.analyzeEmail,
}));

import { POST as analyzeEmail } from "../app/api/analyze/email/route";
import { POST as analyzeUrl } from "../app/api/analyze/url/route";

let requestNumber = 0;

function request(path: string, body: string, contentType = "application/json", address?: string) {
  requestNumber += 1;
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      "x-forwarded-for": address ?? `198.51.100.${requestNumber}`,
    },
    body,
  });
}

beforeEach(() => {
  providerMocks.checkUrl.mockReset().mockResolvedValue({
    provider: "google-safe-browsing",
    status: "no_match",
    threats: [],
    message: "No match was reported.",
  });
  providerMocks.analyzeEmail.mockReset().mockResolvedValue({
    status: "completed",
    result: { findings: [] },
  });
  providerMocks.checkDomain.mockReset().mockResolvedValue({
    provider: "rdap",
    status: "found",
    registeredDomain: "example.com",
    registeredAt: "2020-01-01T00:00:00.000Z",
    ageDays: 2_000,
    message: "The registry reports an established registration date.",
  });
  providerMocks.checkHostname.mockReset().mockResolvedValue({
    status: "public",
    message: "This domain resolves to a public network address.",
  });
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("URL analysis API", () => {
  it("returns a non-cacheable result using the mocked reputation provider", async () => {
    const response = await analyzeUrl(request("/api/analyze/url", JSON.stringify({ url: "https://example.com" })));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("RateLimit-Limit")).toBe("30");
    expect(result.threatIntelligence.status).toBe("no_match");
    expect(result.domainRegistration.status).toBe("found");
    expect(result.dnsSafety.status).toBe("public");
    expect(providerMocks.checkUrl).toHaveBeenCalledWith("https://example.com");
    expect(providerMocks.checkDomain).toHaveBeenCalledWith("example.com");
    expect(providerMocks.checkHostname).toHaveBeenCalledWith("example.com");
  });

  it("returns a usable local result when reputation intelligence is unavailable", async () => {
    providerMocks.checkUrl.mockResolvedValueOnce({
      provider: "google-safe-browsing",
      status: "unavailable",
      threats: [],
      message: "The reputation check is temporarily unavailable.",
    });
    const response = await analyzeUrl(request(
      "/api/analyze/url",
      JSON.stringify({ url: "http://192.0.2.10/login" }),
    ));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.score).toBeGreaterThan(0);
    expect(result.threatIntelligence.status).toBe("unavailable");
  });

  it.each([
    ["wrong content type", "{}", "text/plain", 415, "INVALID_CONTENT_TYPE"],
    ["invalid JSON", "not-json", "application/json", 400, "INVALID_JSON"],
    ["missing URL", "{}", "application/json", 400, "INVALID_INPUT"],
  ])("rejects %s", async (_label, body, contentType, status, code) => {
    const response = await analyzeUrl(request("/api/analyze/url", body, contentType));
    const result = await response.json();

    expect(response.status).toBe(status);
    expect(result.error.code).toBe(code);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects an oversized request before analysis", async () => {
    const body = JSON.stringify({ url: `https://example.com/${"a".repeat(5_000)}` });
    const response = await analyzeUrl(request("/api/analyze/url", body));

    expect(response.status).toBe(413);
    expect(providerMocks.checkUrl).not.toHaveBeenCalled();
    expect(providerMocks.checkDomain).not.toHaveBeenCalled();
    expect(providerMocks.checkHostname).not.toHaveBeenCalled();
  });
});

describe("email analysis API", () => {
  it("defaults AI assistance to off", async () => {
    const response = await analyzeEmail(request(
      "/api/analyze/email",
      JSON.stringify({ content: "Our weekly meeting is tomorrow at 10am." }),
    ));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(result.aiAnalysis.status).toBe("not_requested");
    expect(providerMocks.analyzeEmail).not.toHaveBeenCalled();
  });

  it("returns the complete local result when Gemini is unavailable", async () => {
    providerMocks.analyzeEmail.mockResolvedValueOnce({ status: "unavailable", reason: "timeout" });
    const response = await analyzeEmail(request(
      "/api/analyze/email",
      JSON.stringify({ content: "Act immediately and send your password.", useAi: true }),
    ));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.score).toBeGreaterThan(0);
    expect(result.aiAnalysis.status).toBe("unavailable");
    expect(result.aiAnalysis.message).toContain("local analysis is still complete");
  });

  it.each([
    ["wrong content type", "{}", "text/plain", 415, "INVALID_CONTENT_TYPE"],
    ["invalid JSON", "not-json", "application/json", 400, "INVALID_JSON"],
    ["missing content", "{}", "application/json", 400, "INVALID_INPUT"],
    ["invalid AI choice", JSON.stringify({ content: "Hello", useAi: "yes" }), "application/json", 400, "INVALID_INPUT"],
  ])("rejects %s", async (_label, body, contentType, status, code) => {
    const response = await analyzeEmail(request("/api/analyze/email", body, contentType));
    const result = await response.json();

    expect(response.status).toBe(status);
    expect(result.error.code).toBe(code);
  });

  it("rejects oversized email content before local or AI analysis", async () => {
    const body = JSON.stringify({ content: "a".repeat(66_000), useAi: true });
    const response = await analyzeEmail(request("/api/analyze/email", body));

    expect(response.status).toBe(413);
    expect(providerMocks.analyzeEmail).not.toHaveBeenCalled();
  });
});

describe("shared API protection", () => {
  it("shares the general quota across URL and email routes", async () => {
    const address = "192.0.2.200";

    for (let index = 0; index < 15; index += 1) {
      const response = await analyzeUrl(request("/api/analyze/url", "{}", "application/json", address));
      expect(response.status).toBe(400);
    }

    for (let index = 0; index < 15; index += 1) {
      const response = await analyzeEmail(request("/api/analyze/email", "{}", "application/json", address));
      expect(response.status).toBe(400);
    }

    const blocked = await analyzeUrl(request("/api/analyze/url", "{}", "application/json", address));
    const result = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(result.error.code).toBe("RATE_LIMITED");
  });
});
