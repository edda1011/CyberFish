import { describe, expect, it } from "vitest";
import { analyzeEmailLocally } from "../lib/analyze-email";

function evidenceTitles(content: string) {
  return analyzeEmailLocally(content).evidence.map((item) => item.title);
}

describe("local email analysis", () => {
  it("keeps an ordinary meeting notice at low risk", () => {
    const result = analyzeEmailLocally(
      "Subject: Team meeting\nHi everyone, our weekly meeting is Tuesday at 10am. Regards, Alex",
    );

    expect(result.level).toBe("low");
    expect(result.score).toBe(0);
    expect(result.detectedLinks).toEqual([]);
  });

  it("detects urgent pressure", () => {
    expect(evidenceTitles("Action required immediately. Your access expires today.")).toContain(
      "Urgent pressure",
    );
  });

  it("detects requests for passwords or verification codes", () => {
    const result = analyzeEmailLocally("Reply with your password and one-time password immediately.");

    expect(result.score).toBeGreaterThanOrEqual(28);
    expect(result.evidence.map((item) => item.title)).toContain("Requests sensitive access details");
  });

  it("does not flag a warning that says never to share a code", () => {
    const result = analyzeEmailLocally("Security reminder: never share your verification code with anyone.");

    expect(result.score).toBe(0);
    expect(result.evidence.map((item) => item.title)).not.toContain("Requests sensitive access details");
  });

  it("detects unusual payment requests", () => {
    expect(evidenceTitles("Buy gift cards and send money today.")).toContain("Unusual payment request");
  });

  it("detects dangerous attachment instructions", () => {
    expect(evidenceTitles("Open the attachment and enable macros to read this invoice.")).toContain(
      "Risky download instruction",
    );
  });

  it("extracts and evaluates suspicious links without opening them", () => {
    const result = analyzeEmailLocally("Review your account at http://192.0.2.10/login now.");

    expect(result.detectedLinks).toEqual(["http://192.0.2.10/login"]);
    expect(result.score).toBeGreaterThan(0);
    expect(result.evidence.map((item) => item.title)).toContain("Suspicious link structure");
  });

  it("rejects empty and oversized email text", () => {
    expect(() => analyzeEmailLocally("   ")).toThrow("Paste the email text");
    expect(() => analyzeEmailLocally("a".repeat(50_001))).toThrow("under 50,000");
  });
});
