import type { ThreatIntelligenceResult } from "./threat-intelligence";

export type RiskLevel = "low" | "medium" | "high" | "dangerous";

export type EvidenceSeverity = "positive" | "warning" | "danger";

export interface AnalysisEvidence {
  title: string;
  description: string;
  severity: EvidenceSeverity;
  source?: "local" | "ai";
}

export interface BaseAnalysisResult {
  score: number;
  level: RiskLevel;
  summary: string;
  evidence: AnalysisEvidence[];
  recommendations: string[];
  disclaimer: string;
}

export interface AnalysisResult extends BaseAnalysisResult {
  hostname: string;
  threatIntelligence?: ThreatIntelligenceResult;
}

export interface EmailAnalysisResult extends BaseAnalysisResult {
  detectedLinks: string[];
  aiAnalysis?: {
    status: "not_requested" | "completed" | "unavailable";
    provider: "gemini";
    message: string;
  };
}
