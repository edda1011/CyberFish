import { describe, expect, it } from "vitest";
import { formatEmlFileSize, htmlEmailToPlainText, parseEmlContent, readEmlFile, validateEmlFile } from "../lib/eml-file";

function emlFile(overrides: Partial<{ name: string; size: number; text: () => Promise<string> }> = {}) {
  return {
    name: "message.eml",
    size: 120,
    text: async () => "From: Sender <sender@example.com>\nSubject: Account notice\n\nReview your account.",
    ...overrides,
  };
}

describe(".eml file import", () => {
  it("extracts readable headers and a plain-text body", async () => {
    const result = await readEmlFile(emlFile({
      text: async () => "From: Sender <sender@example.com>\nSubject: Account notice\nDate: Thu, 21 Aug 2026 12:00:00 +0800\n\nReview your account.",
    }));

    expect(result.content).toContain("From: Sender <sender@example.com>");
    expect(result.content).toContain("Subject: Account notice");
    expect(result.content).toContain("Review your account.");
    expect(result.metadata.from).toBe("Sender <sender@example.com>");
    expect(result.metadata.date).toBe("Thu, 21 Aug 2026 12:00:00 +0800");
    expect(result.bodySource).toBe("text");
  });

  it("decodes base64 and quoted-printable message bodies", async () => {
    const base64 = await parseEmlContent("Content-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: base64\n\nUmV2aWV3IHlvdXIgYWNjb3VudC4=");
    const quotedPrintable = await parseEmlContent("Content-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: quoted-printable\n\nClick=20carefully=2E");

    expect(base64.content).toContain("Review your account.");
    expect(quotedPrintable.content).toContain("Click carefully.");
  });

  it("uses the readable plain-text part of a multipart email", async () => {
    const result = await parseEmlContent([
      "Content-Type: multipart/alternative; boundary=part", "", "--part",
      "Content-Type: text/plain; charset=utf-8", "", "Plain version", "--part",
      "Content-Type: text/html; charset=utf-8", "", "<p>HTML version</p>", "--part--",
    ].join("\r\n"));

    expect(result.content).toContain("Plain version");
    expect(result.bodySource).toBe("text");
  });

  it("converts HTML-only mail to text and preserves visible web addresses", async () => {
    const result = await parseEmlContent("Content-Type: text/html; charset=utf-8\n\n<p>Verify at <a href=\"https://example.com/login\">your account</a>.</p><script>alert(1)</script>");

    expect(result.content).toContain("your account (https://example.com/login)");
    expect(result.content).not.toContain("alert(1)");
    expect(result.bodySource).toBe("html");
  });

  it("lists attachment metadata without adding attachment content to analysis text", async () => {
    const result = await parseEmlContent([
      "Content-Type: multipart/mixed; boundary=mixed", "", "--mixed",
      "Content-Type: text/plain", "", "Read the message body.", "--mixed",
      "Content-Type: application/octet-stream; name=invoice.exe",
      "Content-Disposition: attachment; filename=invoice.exe",
      "Content-Transfer-Encoding: base64", "", "REFOR0VST1VTX0FUVEFDSE1FTlQ=", "--mixed--",
    ].join("\r\n"));

    expect(result.attachments).toEqual([{ filename: "invoice.exe", mimeType: "application/octet-stream" }]);
    expect(result.content).not.toContain("DANGEROUS_ATTACHMENT");
  });

  it("removes active HTML content without rendering it", () => {
    expect(htmlEmailToPlainText("<style>body{display:none}</style><p>Hello&nbsp;there</p>"))
      .toBe("Hello there");
  });

  it("accepts an uppercase .EML extension", () => {
    expect(() => validateEmlFile(emlFile({ name: "MESSAGE.EML" }))).not.toThrow();
  });

  it("rejects a file with the wrong extension", () => {
    expect(() => validateEmlFile(emlFile({ name: "message.txt" }))).toThrow("Choose an .eml");
  });

  it("rejects files over 50 KB before reading them", async () => {
    await expect(readEmlFile(emlFile({ size: 50_001 }))).rejects.toThrow("over 50 KB");
  });

  it("rejects empty files and messages without a readable body", async () => {
    await expect(readEmlFile(emlFile({ size: 0 }))).rejects.toThrow("is empty");
    await expect(parseEmlContent("Subject: No body\n\n")).rejects.toThrow("no readable message body");
  });

  it("returns a useful message when the browser cannot read the file", async () => {
    await expect(readEmlFile(emlFile({ text: async () => { throw new Error("raw browser error"); } })))
      .rejects.toThrow("could not read this file");
  });

  it("formats file sizes for the selected-file summary", () => {
    expect(formatEmlFileSize(842)).toBe("842 B");
    expect(formatEmlFileSize(12_400)).toBe("12 KB");
  });
});
