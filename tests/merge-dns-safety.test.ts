import { describe, expect, it } from "vitest";
import { analyzeUrlLocally } from "../lib/analyze-url";
import { mergeDnsSafety } from "../lib/merge-dns-safety";

describe("DNS safety scoring", () => {
  it.each([
    ["non_public", 40, "Domain points to a non-public network"],
    ["not_found", 20, "Domain does not currently resolve"],
    ["public", 0, "Domain resolves to a public network"],
    ["unavailable", 0, "DNS information unavailable"],
  ] as const)("merges %s DNS results", (status, points, title) => {
    const local = analyzeUrlLocally("https://example.com");
    const result = mergeDnsSafety(local, { status, message: "Test status." });

    expect(result.score).toBe(local.score + points);
    expect(result.evidence.some((item) => item.title === title)).toBe(true);
  });

  it("does not duplicate DNS scoring for a direct IP address", () => {
    const local = analyzeUrlLocally("https://127.0.0.1");
    const result = mergeDnsSafety(local, { status: "not_applicable", message: "Not applicable." });

    expect(result.score).toBe(local.score);
    expect(result.evidence).toEqual(local.evidence);
  });
});
