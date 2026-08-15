import { analyzeUrlLocally } from "../../../../lib/analyze-url";

const MAX_BODY_BYTES = 4096;

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
    const result = analyzeUrlLocally(body.url);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "This URL could not be checked.";
    return errorResponse("INVALID_INPUT", message, 400);
  }
}
