import type { AnalysisEvidence, AnalysisResult, RiskLevel } from "./analysis";
import type { DomainRegistrationResult } from "./domain-registration";

function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "dangerous";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function summaryFor(level: RiskLevel) {
  if (level === "dangerous") return "This address contains strong phishing indicators.";
  if (level === "high") return "Several warning signs were detected.";
  if (level === "medium") return "A few details deserve a closer look.";
  return "No obvious structural warning signs were found.";
}

export function mergeDomainRegistration(
  localResult: AnalysisResult,
  registration: DomainRegistrationResult,
): AnalysisResult {
  if (registration.status === "not_applicable") {
    return { ...localResult, domainRegistration: registration };
  }

  let points = 0;
  let evidence: AnalysisEvidence;
  if (registration.status === "unavailable") {
    evidence = {
      title: "Domain registration data unavailable",
      description: `${registration.message} An unknown result should not be treated as proof of safety.`,
      severity: "warning",
    };
  } else if ((registration.ageDays ?? 0) < 30) {
    points = 25;
    evidence = {
      title: "Very recently registered domain",
      description: `${registration.message} Newly registered domains deserve extra caution.`,
      severity: "danger",
    };
  } else if ((registration.ageDays ?? 0) <= 180) {
    points = 12;
    evidence = {
      title: "Recently registered domain",
      description: `${registration.message} A newer domain is one reason to verify the sender carefully.`,
      severity: "warning",
    };
  } else {
    evidence = {
      title: "Established registration date",
      description: `${registration.message} Domain age alone does not prove that a website is safe.`,
      severity: "positive",
    };
  }

  const score = Math.min(100, localResult.score + points);
  const level = riskLevel(score);
  return {
    ...localResult,
    score,
    level,
    summary: points ? summaryFor(level) : localResult.summary,
    evidence: [...localResult.evidence.slice(0, 5), evidence],
    disclaimer: "Structural, registration, and reputation checks can be incomplete or outdated. This result is not a guarantee.",
    domainRegistration: registration,
  };
}
