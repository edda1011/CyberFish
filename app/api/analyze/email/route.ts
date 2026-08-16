import { analyzeEmailLocally } from "../../../../lib/analyze-email";

const MAX_BODY_BYTES = 64 * 1024;

type ErrorCode = "INVALID_CONTENT_TYPE" | "REQUEST_TOO_LARGE" | "INVALID_JSON" | "INVALID_INPUT";

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

  try {
    const result = analyzeEmailLocally(body.content);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "This email could not be analyzed.";
    return errorResponse("INVALID_INPUT", message, 400);
  }
}
