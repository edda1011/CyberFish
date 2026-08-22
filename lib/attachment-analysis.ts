import type { AnalysisEvidence } from "./analysis";

export interface AttachmentMetadata {
  filename: string;
  mimeType: string;
}

export type AttachmentRiskKind = "high_risk" | "macro" | "disguised" | "type_mismatch" | "archive" | "not_scanned";

export interface AttachmentAssessment {
  kind: AttachmentRiskKind;
  label: string;
  points: number;
  severity: "positive" | "warning" | "danger";
}

type WeightedEvidence = AnalysisEvidence & { points: number };

const DANGEROUS_EXTENSIONS = new Set(["exe", "scr", "js", "jse", "bat", "cmd", "ps1", "vbs", "vbe", "msi", "com", "hta", "jar", "lnk"]);
const MACRO_EXTENSIONS = new Set(["docm", "xlsm", "pptm", "xlam", "dotm", "potm", "ppam"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "iso"]);
const LURE_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "jpg", "jpeg", "png", "gif", "txt"]);

function extensions(filename: string) {
  return filename.toLowerCase().split(".").slice(1).filter(Boolean);
}

function hasMimeMismatch(extension: string | undefined, mimeType: string) {
  if (!extension) return false;
  const mime = mimeType.toLowerCase();
  const expected: Record<string, RegExp> = {
    pdf: /^application\/pdf(?:$|;)/,
    jpg: /^image\/jpeg(?:$|;)/,
    jpeg: /^image\/jpeg(?:$|;)/,
    png: /^image\/png(?:$|;)/,
    gif: /^image\/gif(?:$|;)/,
    txt: /^text\/plain(?:$|;)/,
  };
  if (expected[extension] && !expected[extension].test(mime) && mime !== "application/octet-stream") return true;
  return LURE_EXTENSIONS.has(extension) && /(?:x-msdownload|x-executable|x-dosexec|x-msi|javascript|x-sh|x-bat)/i.test(mime);
}

export function assessAttachment(attachment: AttachmentMetadata): AttachmentAssessment {
  const parts = extensions(attachment.filename);
  const extension = parts.at(-1);
  const disguised = parts.length >= 2 && LURE_EXTENSIONS.has(parts.at(-2) ?? "") && (DANGEROUS_EXTENSIONS.has(extension ?? "") || MACRO_EXTENSIONS.has(extension ?? ""));

  if (DANGEROUS_EXTENSIONS.has(extension ?? "")) {
    return { kind: "high_risk", label: disguised ? "High risk · Disguised filename" : "High-risk file type", points: 30, severity: "danger" };
  }
  if (MACRO_EXTENSIONS.has(extension ?? "")) {
    return { kind: "macro", label: disguised ? "Macro-enabled · Disguised filename" : "Macro-enabled file", points: 22, severity: "danger" };
  }
  if (disguised) return { kind: "disguised", label: "Disguised filename", points: 18, severity: "warning" };
  if (hasMimeMismatch(extension, attachment.mimeType)) return { kind: "type_mismatch", label: "File type mismatch", points: 12, severity: "warning" };
  if (ARCHIVE_EXTENSIONS.has(extension ?? "")) return { kind: "archive", label: "Archive · Contents not scanned", points: 0, severity: "warning" };
  return { kind: "not_scanned", label: "Not scanned", points: 0, severity: "positive" };
}

export function isAttachmentMetadataList(value: unknown): value is AttachmentMetadata[] {
  return Array.isArray(value)
    && value.length <= 50
    && value.every((item) => item && typeof item === "object"
      && typeof item.filename === "string" && item.filename.length > 0 && item.filename.length <= 120
      && typeof item.mimeType === "string" && item.mimeType.length > 0 && item.mimeType.length <= 200);
}

export function analyzeAttachments(attachments: AttachmentMetadata[]) {
  const risky = attachments
    .map((attachment) => ({ attachment, assessment: assessAttachment(attachment) }))
    .filter(({ assessment }) => assessment.points > 0)
    .sort((a, b) => b.assessment.points - a.assessment.points);

  const points = Math.min(45, risky.reduce((total, item) => total + item.assessment.points, 0));
  const evidence: WeightedEvidence[] = risky.slice(0, 3).map(({ attachment, assessment }) => ({
    points: assessment.points,
    title: assessment.kind === "macro" ? "Macro-enabled attachment" : assessment.kind === "type_mismatch" ? "Attachment type mismatch" : "High-risk attachment name",
    description: `${attachment.filename} is flagged from its filename or declared file type. CyberFish did not open or scan the attachment.`,
    severity: assessment.severity,
  }));

  if (attachments.length > 0 && risky.length === 0) {
    evidence.push({
      points: 0,
      title: "Attachments were not scanned",
      description: "No obvious filename warning was found, but CyberFish did not inspect the attachment contents.",
      severity: "warning",
    });
  }

  return { points, evidence };
}
