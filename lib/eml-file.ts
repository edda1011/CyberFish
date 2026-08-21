export const MAX_EML_FILE_BYTES = 50_000;

export type ReadableEmlFile = Pick<File, "name" | "size" | "text">;

export function validateEmlFile(file: Pick<ReadableEmlFile, "name" | "size">) {
  if (!file.name.toLowerCase().endsWith(".eml")) {
    throw new Error("Choose an .eml email file.");
  }

  if (file.size === 0) {
    throw new Error("This .eml file is empty. Choose a file that contains an email.");
  }

  if (file.size > MAX_EML_FILE_BYTES) {
    throw new Error("This .eml file is over 50 KB. Choose a smaller file.");
  }
}

export async function readEmlFile(file: ReadableEmlFile) {
  validateEmlFile(file);

  let content: string;

  try {
    content = await file.text();
  } catch {
    throw new Error("CyberFish could not read this file. Try choosing it again.");
  }

  if (!content.trim()) {
    throw new Error("This .eml file is empty. Choose a file that contains an email.");
  }

  if (content.length > MAX_EML_FILE_BYTES) {
    throw new Error("This .eml file contains too much text. Choose a smaller file.");
  }

  return content;
}

export function formatEmlFileSize(size: number) {
  if (size < 1_000) return `${size} B`;
  return `${(size / 1_000).toFixed(size < 10_000 ? 1 : 0)} KB`;
}
