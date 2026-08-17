import { analyzeEmailLocally } from "../../../../lib/analyze-email";
import { mergeEmailAiResult } from "../../../../lib/email-ai";
import { analyzeEmailWithGemini, type GeminiUnavailableReason } from "../../../../lib/gemini-email";

const MAX_BODY_BYTES = 64 * 1024;

type ErrorCode = "INVALID_CONTENT_TYPE" | "REQUEST_TOO_LARGE" | "INVALID_JSON" | "INVALID_INPUT";

const AI_UNAVAILABLE_MESSAGES: Record<GeminiUnavailableReason, string> = {
  not_configured: "AI analysis is not configured. The local analysis is still complete.",
  timeout: "AI analysis took too long. The local analysis is still complete.",
  provider_error: "AI analysis is temporarily unavailable. The local analysis is still complete.",
  invalid_response: "AI analysis returned an unusable response. The local analysis is still complete.",
};

function errorResponse(code: ErrorCode, message: string, status: number) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return errorResponse("INVALID_CONTENT_TYPE", "Send the request as application/json.", 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return errorResponse("REQUEST_TOO_LARGE", "The request is too large.", 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse("INVALID_JSON", "The request body could not be read.", 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return errorResponse("REQUEST_TOO_LARGE", "The request is too large.", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return errorResponse("INVALID_JSON", "The request body must contain valid JSON.", 400);
  }

  if (!body || typeof body !== "object" || !("content" in body) || typeof body.content !== "string") {
    return errorResponse("INVALID_INPUT", "Provide the email content as a text value.", 400);
  }

  if ("useAi" in body && typeof body.useAi !== "boolean") {
    return errorResponse("INVALID_INPUT", "The AI analysis choice must be true or false.", 400);
  }

  try {
    const localResult = analyzeEmailLocally(body.content);
    const useAi = "useAi" in body && body.useAi === true;

    if (!useAi) {
      return Response.json({
        ...localResult,
        aiAnalysis: {
          status: "not_requested",
          provider: "gemini",
          message: "AI analysis was not requested.",
        },
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const aiResult = await analyzeEmailWithGemini(body.content);
    if (aiResult.status === "completed") {
      return Response.json(
        mergeEmailAiResult(localResult, aiResult.result),
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    return Response.json({
      ...localResult,
      aiAnalysis: {
        status: "unavailable",
        provider: "gemini",
        message: AI_UNAVAILABLE_MESSAGES[aiResult.reason],
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "This email could not be analyzed.";
    return errorResponse("INVALID_INPUT", message, 400);
  }
}
