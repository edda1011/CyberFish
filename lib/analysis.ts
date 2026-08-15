import type { ThreatIntelligenceResult } from "./threat-intelligence";

export type RiskLevel = "low" | "medium" | "high" | "dangerous";

export type EvidenceSeverity = "positive" | "warning" | "danger";

export interface AnalysisEvidence {
  title: string;
  description: string;
  severity: EvidenceSeverity;
}

export interface AnalysisResult {
  score: number;
  level: RiskLevel;
  summary: string;
  hostname: string;
  evidence: AnalysisEvidence[];
  recommendations: string[];
  disclaimer: string;
  threatIntelligence?: ThreatIntelligenceResult;
}
