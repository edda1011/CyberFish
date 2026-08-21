import { describe, expect, it } from "vitest";
import { formatEmlFileSize, readEmlFile, validateEmlFile } from "../lib/eml-file";

function emlFile(overrides: Partial<{ name: string; size: number; text: () => Promise<string> }> = {}) {
  return {
    name: "message.eml",
    size: 120,
    text: async () => "From: sender@example.com\nSubject: Account notice\n\nReview your account.",
    ...overrides,
  };
}

describe(".eml file import", () => {
  it("reads a valid .eml file without changing its content", async () => {
    const file = emlFile();
    await expect(readEmlFile(file)).resolves.toBe(await file.text());
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

  it("rejects empty and whitespace-only files", async () => {
    await expect(readEmlFile(emlFile({ size: 0 }))).rejects.toThrow("is empty");
    await expect(readEmlFile(emlFile({ text: async () => "   " }))).rejects.toThrow("is empty");
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
