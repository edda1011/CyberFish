import { describe, expect, it } from "vitest";
import { analyzeUrlLocally } from "../lib/analyze-url";

describe("local URL analysis", () => {
  it("treats a simple HTTPS URL as low risk without calling the network", () => {
    const result = analyzeUrlLocally("https://example.com/account");

    expect(result.hostname).toBe("example.com");
    expect(result.level).toBe("low");
    expect(result.score).toBe(0);
    expect(result.evidence.map((item) => item.title)).toContain("Uses HTTPS");
  });

  it("flags an unencrypted HTTP URL", () => {
    const result = analyzeUrlLocally("http://example.com");

    expect(result.score).toBeGreaterThan(0);
    expect(result.evidence.map((item) => item.title)).toContain("No HTTPS encryption");
  });

  it("flags direct IP addresses", () => {
    const result = analyzeUrlLocally("https://192.0.2.10/login");

    expect(result.score).toBeGreaterThanOrEqual(35);
    expect(result.evidence.map((item) => item.title)).toContain("IP address instead of a domain");
  });

  it("flags Punycode domains", () => {
    const result = analyzeUrlLocally("https://xn--pple-43d.example");

    expect(result.score).toBeGreaterThanOrEqual(25);
    expect(result.evidence.map((item) => item.title)).toContain("Encoded international domain");
  });

  it("flags known URL shorteners", () => {
    const result = analyzeUrlLocally("https://bit.ly/example");

    expect(result.level).toBe("medium");
    expect(result.evidence.map((item) => item.title)).toContain("Shortened link");
  });

  it("flags excessive subdomains", () => {
    const result = analyzeUrlLocally("https://login.security.account.example.com");

    expect(result.evidence.map((item) => item.title)).toContain("Many subdomains");
  });

  it("rejects empty, unsupported, and oversized input", () => {
    expect(() => analyzeUrlLocally("   ")).toThrow("Enter a URL");
    expect(() => analyzeUrlLocally("ftp://example.com")).toThrow("Only HTTP and HTTPS");
    expect(() => analyzeUrlLocally(`https://example.com/${"a".repeat(2050)}`)).toThrow("under 2,048");
  });
});
