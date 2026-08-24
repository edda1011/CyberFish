import { BrowserQRCodeReader } from "@zxing/browser";

export const MAX_QR_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_QR_IMAGE_EDGE = 4096;
export const MAX_QR_IMAGE_PIXELS = 16_000_000;
export const MAX_QR_CONTENT_LENGTH = 4096;

const IMAGE_EXTENSIONS_BY_TYPE = new Map([
  ["image/png", ["png"]],
  ["image/jpeg", ["jpg", "jpeg"]],
  ["image/webp", ["webp"]],
]);

export type QrImageErrorCode =
  | "EMPTY_FILE"
  | "UNSUPPORTED_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_DIMENSIONS"
  | "QR_NOT_FOUND"
  | "EMPTY_CONTENT"
  | "CONTENT_TOO_LONG";

export class QrImageError extends Error {
  constructor(public readonly code: QrImageErrorCode, message: string) {
    super(message);
    this.name = "QrImageError";
  }
}

type QrImageFileMetadata = Pick<File, "name" | "size" | "type">;

type QrCanvasDecoder = {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
};

function fileExtension(filename: string) {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot + 1).toLowerCase() : "";
}

export function validateQrImageFile(file: QrImageFileMetadata) {
  if (file.size <= 0) {
    throw new QrImageError("EMPTY_FILE", "This image is empty. Choose another PNG, JPG, or WebP file.");
  }

  if (file.size > MAX_QR_IMAGE_BYTES) {
    throw new QrImageError("FILE_TOO_LARGE", "Choose an image smaller than 10 MB.");
  }

  const allowedExtensions = IMAGE_EXTENSIONS_BY_TYPE.get(file.type.toLowerCase());
  if (!allowedExtensions?.includes(fileExtension(file.name))) {
    throw new QrImageError("UNSUPPORTED_FILE", "Choose a PNG, JPG, JPEG, or WebP image.");
  }
}

export function boundedQrImageDimensions(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new QrImageError("INVALID_DIMENSIONS", "CyberFish could not read this image. Choose another file.");
  }

  const edgeScale = Math.min(1, MAX_QR_IMAGE_EDGE / Math.max(width, height));
  const pixelScale = Math.min(1, Math.sqrt(MAX_QR_IMAGE_PIXELS / (width * height)));
  const scale = Math.min(edgeScale, pixelScale);

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function validateQrContent(content: string) {
  const cleaned = content.trim();
  if (!cleaned) {
    throw new QrImageError("EMPTY_CONTENT", "This QR code does not contain readable content.");
  }
  if (cleaned.length > MAX_QR_CONTENT_LENGTH) {
    throw new QrImageError("CONTENT_TOO_LONG", "This QR code contains too much data to display safely.");
  }
  return cleaned;
}

export function decodeQrCanvas(
  canvas: HTMLCanvasElement,
  decoder: QrCanvasDecoder = new BrowserQRCodeReader(),
) {
  try {
    return validateQrContent(decoder.decodeFromCanvas(canvas).getText());
  } catch (error) {
    if (error instanceof QrImageError) throw error;
    throw new QrImageError("QR_NOT_FOUND", "No QR code was found. Try a clearer or more tightly cropped image.");
  }
}
