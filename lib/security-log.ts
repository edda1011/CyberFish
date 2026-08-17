type SecurityEndpoint = "url" | "email";

type SecurityOutcome =
  | "completed"
  | "validation_failed"
  | "rate_limited"
  | "provider_unavailable"
  | "unexpected_error";

type AiStatus =
  | "not_requested"
  | "completed"
  | "not_configured"
  | "timeout"
  | "provider_error"
  | "invalid_response";

type ThreatIntelligenceStatus = "match" | "no_match" | "unavailable";

type SecurityErrorCode =
  | "INVALID_CONTENT_TYPE"
  | "REQUEST_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "AI_RATE_LIMITED"
  | "UNEXPECTED_ERROR";

export type SecurityEventDetails = {
  outcome: SecurityOutcome;
  status: number;
  errorCode?: SecurityErrorCode;
  aiRequested?: boolean;
  aiStatus?: AiStatus;
  threatIntelligenceStatus?: ThreatIntelligenceStatus;
};

export function createSecurityLogger(endpoint: SecurityEndpoint) {
  const startedAt = performance.now();

  return (details: SecurityEventDetails) => {
    const event = JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "cyberfish",
      endpoint,
      ...details,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });

    if (details.outcome === "unexpected_error") {
      console.error(event);
    } else if (details.outcome === "rate_limited" || details.outcome === "provider_unavailable") {
      console.warn(event);
    } else {
      console.info(event);
    }
  };
}
