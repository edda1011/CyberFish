import { describe, expect, it } from "vitest";
import { analyzeEmailHeaders, isEmailHeaderSignals, type EmailHeaderSignals } from "../lib/email-header-analysis";

function signals(overrides: Partial<EmailHeaderSignals> = {}): EmailHeaderSignals {
  return {
    fromAddress: "security@example.com",
    fromName: "Example Security",
    replyToAddresses: ["help@example.com"],
    messageId: "<notice@example.com>",
    authentication: { spf: "pass", dkim: "pass", dmarc: "pass" },
    ...overrides,
  };
}

describe("email header analysis", () => {
  it("shows reported passes without increasing risk", () => {
    const result = analyzeEmailHeaders(signals());
    expect(result.points).toBe(0);
    expect(result.evidence.map((item) => item.title)).toContain("Reported email authentication passed");
  });

  it("scores explicit authentication failures and caps their combined contribution", () => {
    const result = analyzeEmailHeaders(signals({ authentication: { spf: "fail", dkim: "fail", dmarc: "fail" } }));
    expect(result.points).toBe(50);
    expect(result.evidence.map((item) => item.title)).toEqual(expect.arrayContaining([
      "SPF authentication failed", "DKIM authentication failed", "DMARC authentication failed",
    ]));
  });

  it("does not score missing authentication data", () => {
    const result = analyzeEmailHeaders(signals({ authentication: {} }));
    expect(result.points).toBe(0);
    expect(result.evidence[0].title).toBe("Email authentication data unavailable");
  });

  it("detects reply, message ID, and known-brand domain mismatches", () => {
    const result = analyzeEmailHeaders(signals({
      fromAddress: "support@unrelated.example",
      fromName: "PayPal Security",
      replyToAddresses: ["payment@another.example"],
      messageId: "<notice@mailer.example>",
    }));
    expect(result.evidence.map((item) => item.title)).toEqual(expect.arrayContaining([
      "Reply address uses a different domain",
      "Message ID uses a different domain",
      "Sender name may imitate a known brand",
    ]));
  });

  it("validates the bounded API representation", () => {
    expect(isEmailHeaderSignals(signals())).toBe(true);
    expect(isEmailHeaderSignals({ ...signals(), replyToAddresses: "reply@example.com" })).toBe(false);
    expect(isEmailHeaderSignals({ ...signals(), authentication: { spf: "invented" } })).toBe(false);
  });
});
