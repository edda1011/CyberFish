import { analyzeUrlLocally } from "../../../../lib/analyze-url";
import { domainRegistration } from "../../../../lib/domain-registration";
import { mergeDomainRegistration } from "../../../../lib/merge-domain-registration";
import { mergeThreatIntelligence } from "../../../../lib/merge-threat-intelligence";
import { ANALYSIS_RATE_LIMIT, consumeRateLimit, rateLimitHeaders } from "../../../../lib/rate-limit";
import { createSecurityLogger } from "../../../../lib/security-log";
import { threatIntelligence } from "../../../../lib/threat-intelligence";

const MAX_BODY_BYTES = 4096;

type ErrorCode = "INVALID_CONTENT_TYPE" | "REQUEST_TOO_LARGE" | "INVALID_JSON" | "INVALID_INPUT" | "RATE_LIMITED";

function errorResponse(code: ErrorCode, message: string, status: number, headers?: Record<string, string>) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

export async function POST(request: Request) {
  const logSecurityEvent = createSecurityLogger("url");
  const rateLimit = consumeRateLimit(request, ANALYSIS_RATE_LIMIT);
  if (!rateLimit.allowed) {
    const minutes = Math.max(1, Math.ceil(rateLimit.retryAfterSeconds / 60));
    logSecurityEvent({ outcome: "rate_limited", status: 429, errorCode: "RATE_LIMITED" });
    return errorResponse(
      "RATE_LIMITED",
      `Too many analyses. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      429,
      rateLimitHeaders(rateLimit),
    );
  }

  const responseHeaders = {
    "Cache-Control": "no-store",
    ...rateLimitHeaders(rateLimit),
  };

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    logSecurityEvent({ outcome: "validation_failed", status: 415, errorCode: "INVALID_CONTENT_TYPE" });
    return errorResponse("INVALID_CONTENT_TYPE", "Send the request as application/json.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    logSecurityEvent({ outcome: "validation_failed", status: 413, errorCode: "REQUEST_TOO_LARGE" });
    return errorResponse("REQUEST_TOO_LARGE", "The request is too large.", 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    logSecurityEvent({ outcome: "validation_failed", status: 413, errorCode: "REQUEST_TOO_LARGE" });
    return errorResponse("REQUEST_TOO_LARGE", "The request is too large.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    logSecurityEvent({ outcome: "validation_failed", status: 400, errorCode: "INVALID_JSON" });
    return errorResponse("INVALID_JSON", "The request body must contain valid JSON.", 400);
  }

  if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") {
    logSecurityEvent({ outcome: "validation_failed", status: 400, errorCode: "INVALID_INPUT" });
    return errorResponse("INVALID_INPUT", "Provide a URL as a text value.", 400);
  }

  try {
    const localResult = analyzeUrlLocally(body.url);
    const [intelligence, registration] = await Promise.all([
      threatIntelligence.checkUrl(body.url),
      domainRegistration.checkDomain(localResult.hostname),
    ]);
    const result = mergeThreatIntelligence(
      mergeDomainRegistration(localResult, registration),
      intelligence,
    );
    logSecurityEvent({
      outcome: "completed",
      status: 200,
      threatIntelligenceStatus: intelligence.status,
      domainRegistrationStatus: registration.status,
    });
    return Response.json(result, { headers: responseHeaders });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "This URL could not be checked.";
    logSecurityEvent({ outcome: "validation_failed", status: 400, errorCode: "INVALID_INPUT" });
    return errorResponse("INVALID_INPUT", message, 400);
  }
}
