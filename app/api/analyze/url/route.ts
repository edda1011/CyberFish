import { analyzeUrlLocally } from "../../../../lib/analyze-url";
import { mergeThreatIntelligence } from "../../../../lib/merge-threat-intelligence";
import { ANALYSIS_RATE_LIMIT, consumeRateLimit, rateLimitHeaders } from "../../../../lib/rate-limit";
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
  const rateLimit = consumeRateLimit(request, ANALYSIS_RATE_LIMIT);
  if (!rateLimit.allowed) {
    const minutes = Math.max(1, Math.ceil(rateLimit.retryAfterSeconds / 60));
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
    return errorResponse("INVALID_CONTENT_TYPE", "Send the request as application/json.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse("REQUEST_TOO_LARGE", "The request is too large.", 413);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return errorResponse("REQUEST_TOO_LARGE", "The request is too large.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse("INVALID_JSON", "The request body must contain valid JSON.", 400);
  }

  if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string") {
    return errorResponse("INVALID_INPUT", "Provide a URL as a text value.", 400);
  }

  try {
    const localResult = analyzeUrlLocally(body.url);
    const intelligence = await threatIntelligence.checkUrl(body.url);
    const result = mergeThreatIntelligence(localResult, intelligence);
    return Response.json(result, { headers: responseHeaders });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "This URL could not be checked.";
    return errorResponse("INVALID_INPUT", message, 400);
  }
}
