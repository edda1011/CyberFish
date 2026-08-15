export type ThreatIntelStatus = "match" | "no_match" | "unavailable";

export interface ThreatIntelligenceResult {
  provider: "google-safe-browsing";
  status: ThreatIntelStatus;
  threats: string[];
  message: string;
  advisoryUrl?: string;
}

export interface ThreatIntelligenceProvider {
  checkUrl(url: string): Promise<ThreatIntelligenceResult>;
}
