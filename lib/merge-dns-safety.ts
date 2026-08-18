import type { AnalysisEvidence, AnalysisResult, RiskLevel } from "./analysis";
import type { DnsSafetyResult } from "./dns-safety";

function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "dangerous";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}

export function mergeDnsSafety(localResult: AnalysisResult, dns: DnsSafetyResult): AnalysisResult {
  if (dns.status === "not_applicable") return { ...localResult, dnsSafety: dns };

  let points = 0;
  let evidence: AnalysisEvidence;
  if (dns.status === "non_public") {
    points = 40;
    evidence = {
      title: "Domain points to a non-public network",
      description: "The domain resolves to an internal, local, or reserved address. Do not use it unless you expected an internal service.",
      severity: "danger",
    };
  } else if (dns.status === "not_found") {
    points = 20;
    evidence = {
      title: "Domain does not currently resolve",
      description: "The address may be mistyped, expired, or unavailable. Verify it through an official source.",
      severity: "warning",
    };
  } else if (dns.status === "unavailable") {
    evidence = {
      title: "DNS information unavailable",
      description: "The DNS check could not be completed. An unknown result should not be treated as proof of safety.",
      severity: "warning",
    };
  } else {
    evidence = {
      title: "Domain resolves to a public network",
      description: "The domain has a public network destination, but this alone does not prove the website is trustworthy.",
      severity: "positive",
    };
  }

  const score = Math.min(100, localResult.score + points);
  const level = riskLevel(score);
  return {
    ...localResult,
    score,
    level,
    summary: points > 0
      ? level === "dangerous" ? "This address contains strong phishing indicators."
        : level === "high" ? "Several warning signs were detected."
          : "A few details deserve a closer look."
      : localResult.summary,
    evidence: [...localResult.evidence.slice(0, 5), evidence],
    dnsSafety: dns,
  };
}
