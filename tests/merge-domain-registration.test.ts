import { describe, expect, it } from "vitest";
import { analyzeUrlLocally } from "../lib/analyze-url";
import { mergeDomainRegistration } from "../lib/merge-domain-registration";

describe("domain registration scoring", () => {
  it.each([
    [29, 25, "Very recently registered domain"],
    [30, 12, "Recently registered domain"],
    [180, 12, "Recently registered domain"],
    [181, 0, "Established registration date"],
  ])("scores a domain aged %i days", (ageDays, points, title) => {
    const local = analyzeUrlLocally("https://example.com");
    const result = mergeDomainRegistration(local, {
      provider: "rdap",
      status: "found",
      registeredDomain: "example.com",
      registeredAt: "2026-01-01T00:00:00.000Z",
      ageDays,
      message: `The registry reports that this domain was registered ${ageDays} days ago.`,
    });

    expect(result.score).toBe(local.score + points);
    expect(result.evidence.some((item) => item.title === title)).toBe(true);
  });

  it("shows uncertainty without increasing risk when registration data is unavailable", () => {
    const local = analyzeUrlLocally("https://example.com");
    const result = mergeDomainRegistration(local, {
      provider: "rdap",
      status: "unavailable",
      message: "Domain registration data is currently unavailable.",
    });

    expect(result.score).toBe(local.score);
    expect(result.evidence.at(-1)?.description).toContain("not be treated as proof of safety");
  });

  it("does not add registration evidence for IP addresses", () => {
    const local = analyzeUrlLocally("https://192.0.2.10");
    const result = mergeDomainRegistration(local, {
      provider: "rdap",
      status: "not_applicable",
      message: "Domain registration age does not apply to this address.",
    });

    expect(result.evidence).toEqual(local.evidence);
  });
});
