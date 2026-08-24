import { describe, expect, it } from "vitest";
import {
  MAX_QR_CONTENT_LENGTH,
  MAX_QR_IMAGE_BYTES,
  MAX_QR_IMAGE_EDGE,
  QrImageError,
  boundedQrImageDimensions,
  decodeQrCanvas,
  validateQrContent,
  validateQrImageFile,
} from "../lib/qr-image";

function imageFile(name: string, type: string, size = 1000) {
  return { name, type, size };
}

describe("QR image safety boundaries", () => {
  it.each([
    ["code.png", "image/png"],
    ["code.jpg", "image/jpeg"],
    ["code.JPEG", "image/jpeg"],
    ["code.webp", "image/webp"],
  ])("accepts a supported %s image", (name, type) => {
    expect(() => validateQrImageFile(imageFile(name, type))).not.toThrow();
  });

  it.each([
    ["code.gif", "image/gif"],
    ["code.png", "image/jpeg"],
    ["code.exe", "image/png"],
    ["code", "image/png"],
  ])("rejects unsupported or mismatched file metadata", (name, type) => {
    expect(() => validateQrImageFile(imageFile(name, type))).toThrowError(QrImageError);
    try {
      validateQrImageFile(imageFile(name, type));
    } catch (error) {
      expect(error).toMatchObject({ code: "UNSUPPORTED_FILE" });
    }
  });

  it("rejects empty and oversized files", () => {
    expect(() => validateQrImageFile(imageFile("code.png", "image/png", 0))).toThrow("empty");
    expect(() => validateQrImageFile(imageFile("code.png", "image/png", MAX_QR_IMAGE_BYTES + 1))).toThrow("10 MB");
  });

  it("keeps ordinary dimensions and scales extreme images within both limits", () => {
    expect(boundedQrImageDimensions(1200, 800)).toEqual({ width: 1200, height: 800 });

    const bounded = boundedQrImageDimensions(12_000, 8_000);
    expect(Math.max(bounded.width, bounded.height)).toBeLessThanOrEqual(MAX_QR_IMAGE_EDGE);
    expect(bounded.width * bounded.height).toBeLessThanOrEqual(16_000_000);
  });

  it("rejects invalid dimensions", () => {
    expect(() => boundedQrImageDimensions(0, 200)).toThrowError(QrImageError);
    expect(() => boundedQrImageDimensions(Number.NaN, 200)).toThrow("could not read");
  });

  it("trims readable QR content and bounds its length", () => {
    expect(validateQrContent("  https://example.com  ")).toBe("https://example.com");
    expect(() => validateQrContent("   ")).toThrow("does not contain readable content");
    expect(() => validateQrContent("a".repeat(MAX_QR_CONTENT_LENGTH + 1))).toThrow("too much data");
  });

  it("decodes a canvas without opening or fetching the result", () => {
    const decoder = { decodeFromCanvas: () => ({ getText: () => "https://example.com/account" }) };
    expect(decodeQrCanvas({} as HTMLCanvasElement, decoder)).toBe("https://example.com/account");
  });

  it("normalizes decoder failures into a recoverable no-code error", () => {
    const decoder = { decodeFromCanvas: () => { throw new Error("library detail"); } };
    expect(() => decodeQrCanvas({} as HTMLCanvasElement, decoder)).toThrow("Try a clearer");
    try {
      decodeQrCanvas({} as HTMLCanvasElement, decoder);
    } catch (error) {
      expect(error).toMatchObject({ code: "QR_NOT_FOUND" });
    }
  });
});
