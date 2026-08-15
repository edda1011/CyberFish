import type { AnalysisEvidence, AnalysisResult } from "./analysis";
import type { ThreatIntelligenceResult } from "./threat-intelligence";

export function mergeThreatIntelligence(
  localResult: AnalysisResult,
  intelligence: ThreatIntelligenceResult,
): AnalysisResult {
  if (intelligence.status === "match") {
    const threatEvidence: AnalysisEvidence = {
      title: "Known threat intelligence match",
      description: `${intelligence.message} Reported type: ${intelligence.threats.join(", ")}.`,
      severity: "danger",
    };

    return {
      ...localResult,
      score: Math.max(90, localResult.score),
      level: "dangerous",
      summary: "This address is listed as a possible threat.",
      evidence: [threatEvidence, ...localResult.evidence].slice(0, 6),
      recommendations: [
        "Do not open this link or enter any personal information.",
        "Delete the message or verify it through an official channel you already trust.",
      ],
      disclaimer: "Threat intelligence and structural checks can contain false positives or miss new threats. This result is not a guarantee.",
      threatIntelligence: intelligence,
    };
  }

  const evidence = {
    title: intelligence.status === "no_match" ? "No known threat-list match" : "Threat intelligence unavailable",
    description: intelligence.message,
    severity: intelligence.status === "no_match" ? "positive" as const : "warning" as const,
  };

  return {
    ...localResult,
    evidence: [...localResult.evidence, evidence].slice(0, 6),
    threatIntelligence: intelligence,
  };
}
