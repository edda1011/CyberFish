import { describe, expect, it } from "vitest";
import { analyzeAttachments, assessAttachment, isAttachmentMetadataList } from "../lib/attachment-analysis";

describe("attachment metadata analysis", () => {
  it.each([
    ["invoice.exe", "application/octet-stream", "high_risk", 30],
    ["report.docm", "application/vnd.ms-word.document.macroenabled.12", "macro", 22],
    ["invoice.pdf.exe", "application/octet-stream", "high_risk", 30],
    ["report.pdf", "application/x-msdownload", "type_mismatch", 12],
    ["report.pdf", "application/pdf", "not_scanned", 0],
    ["files.zip", "application/zip", "archive", 0],
  ])("classifies %s", (filename, mimeType, kind, points) => {
    expect(assessAttachment({ filename, mimeType, size: 1_000 })).toMatchObject({ kind, points });
  });

  it("uses one score per attachment and caps the total contribution", () => {
    const result = analyzeAttachments([
      { filename: "invoice.pdf.exe", mimeType: "application/x-msdownload", size: 1_000 },
      { filename: "update.scr", mimeType: "application/octet-stream", size: 1_000 },
    ]);
    expect(result.points).toBe(45);
  });

  it("keeps ordinary attachment names at zero while explaining they were not scanned", () => {
    const result = analyzeAttachments([{ filename: "report.pdf", mimeType: "application/pdf", size: 1_000 }]);
    expect(result.points).toBe(0);
    expect(result.evidence[0].title).toBe("Attachments were not scanned");
  });

  it("validates bounded attachment metadata", () => {
    expect(isAttachmentMetadataList([{ filename: "report.pdf", mimeType: "application/pdf", size: 1_000 }])).toBe(true);
    expect(isAttachmentMetadataList([{ filename: "", mimeType: "application/pdf", size: 1_000 }])).toBe(false);
    expect(isAttachmentMetadataList([{ filename: "report.pdf", mimeType: "application/pdf", size: -1 }])).toBe(false);
    expect(isAttachmentMetadataList([{ filename: "report.pdf", mimeType: "application/pdf", size: 15_000_001 }])).toBe(false);
    expect(isAttachmentMetadataList("report.pdf")).toBe(false);
  });

  it("adds limited context for a large attachment", () => {
    const result = analyzeAttachments([{ filename: "video.mp4", mimeType: "video/mp4", size: 10_000_001 }]);
    expect(result.points).toBe(8);
    expect(result.evidence.map((item) => item.title)).toContain("Large attachment included");
  });

  it("adds limited context for many attachments and caps combined context at twelve points", () => {
    const attachments = Array.from({ length: 5 }, (_, index) => ({
      filename: `document-${index}.pdf`, mimeType: "application/pdf", size: index === 0 ? 10_000_001 : 1_000,
    }));
    const result = analyzeAttachments(attachments);
    expect(result.points).toBe(12);
    expect(result.evidence.map((item) => item.title)).toContain("Many attachments included");
  });
});
