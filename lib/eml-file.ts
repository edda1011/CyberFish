import PostalMime from "postal-mime";
import type { Address, Mailbox } from "postal-mime";
import type { EmailAuthenticationMethod, EmailAuthenticationStatus, EmailHeaderSignals } from "./email-header-analysis";
import type { AttachmentMetadata } from "./attachment-analysis";

export const MAX_EML_FILE_BYTES = 15_000_000;
export const MAX_EML_READABLE_TEXT_CHARACTERS = 50_000;

export type ReadableEmlFile = Pick<File, "name" | "size" | "text">;

export interface ParsedEmlAttachment extends AttachmentMetadata {}

export interface ParsedEmlContent {
  content: string;
  metadata: {
    from?: string;
    replyTo?: string;
    to?: string;
    subject?: string;
    date?: string;
  };
  attachments: ParsedEmlAttachment[];
  bodySource: "text" | "html";
  headerSignals: EmailHeaderSignals;
}

export function validateEmlFile(file: Pick<ReadableEmlFile, "name" | "size">) {
  if (!file.name.toLowerCase().endsWith(".eml")) {
    throw new Error("Choose an .eml email file.");
  }

  if (file.size === 0) {
    throw new Error("This .eml file is empty. Choose a file that contains an email.");
  }

  if (file.size > MAX_EML_FILE_BYTES) {
    throw new Error("This .eml file is over 15 MB. Choose a smaller file.");
  }
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: "\"",
  };

  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isSafeInteger(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isSafeInteger(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  });
}

export function htmlEmailToPlainText(html: string) {
  const withoutActiveContent = html
    .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ");

  const withVisibleLinks = withoutActiveContent.replace(
    /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_match, _quote: string, rawHref: string, rawLabel: string) => {
      const href = decodeHtmlEntities(rawHref.trim());
      const label = decodeHtmlEntities(rawLabel.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      if (!/^https?:\/\//i.test(href)) return label;
      return label && label !== href ? `${label} (${href})` : href;
    },
  );

  return decodeHtmlEntities(
    withVisibleLinks
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)\s*>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mailboxes(addresses: Address[] | undefined) {
  if (!addresses) return [];
  return addresses.flatMap((address) => address.group ?? [address as Mailbox]);
}

function formatAddresses(addresses: Address[] | undefined) {
  const values = mailboxes(addresses).map(({ name, address }) => name ? `${name} <${address}>` : address);
  return values.length > 0 ? values.join(", ") : undefined;
}

function formatAddress(address: Address | undefined) {
  return address ? formatAddresses([address]) : undefined;
}

function cleanHeader(value: string | undefined) {
  const cleaned = value?.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
}

function cleanAttachmentName(filename: string | null, index: number) {
  const cleaned = filename?.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/[\\/]+/g, "_").replace(/\s+/g, " ").trim();
  if (!cleaned) return `Unnamed attachment ${index + 1}`;
  return cleaned.slice(0, 120);
}

function authenticationStatus(value: string, method: EmailAuthenticationMethod): EmailAuthenticationStatus | undefined {
  const match = value.match(new RegExp(`(?:^|[;\\s])${method}=([a-z]+)`, "i"));
  if (!match) return undefined;
  const normalized = match[1].toLowerCase();
  const known: EmailAuthenticationStatus[] = ["pass", "fail", "softfail", "neutral", "none", "temperror", "permerror"];
  return known.includes(normalized as EmailAuthenticationStatus) ? normalized as EmailAuthenticationStatus : "unknown";
}

function extractAuthentication(headers: Array<{ key: string; value: string }>) {
  const values = headers.filter(({ key }) => key === "authentication-results").map(({ value }) => value);
  const receivedSpf = headers.find(({ key }) => key === "received-spf")?.value;
  const authentication: EmailHeaderSignals["authentication"] = {};

  for (const method of ["spf", "dkim", "dmarc"] as const) {
    for (const value of values) {
      const status = authenticationStatus(value, method);
      if (status) {
        authentication[method] = status;
        break;
      }
    }
  }

  if (!authentication.spf && receivedSpf) {
    const match = receivedSpf.match(/^\s*([a-z]+)/i);
    if (match) {
      const status = match[1].toLowerCase();
      authentication.spf = ["pass", "fail", "softfail", "neutral", "none", "temperror", "permerror"].includes(status)
        ? status as EmailAuthenticationStatus
        : "unknown";
    }
  }

  return authentication;
}

export async function parseEmlContent(rawEmail: string): Promise<ParsedEmlContent> {
  let parsed;

  try {
    parsed = await PostalMime.parse(rawEmail, {
      attachmentEncoding: "arraybuffer",
      maxHeadersSize: 16_384,
      maxNestingDepth: 30,
      maxRfc822NestingDepth: 3,
      rfc822Attachments: true,
    });
  } catch {
    throw new Error("CyberFish could not understand this .eml file. Try exporting the email again.");
  }

  const plainBody = parsed.text?.trim();
  const htmlBody = parsed.html ? htmlEmailToPlainText(parsed.html) : "";
  const body = plainBody || htmlBody;

  if (!body) {
    throw new Error("This .eml file has no readable message body.");
  }

  const metadata = {
    from: cleanHeader(formatAddress(parsed.from)),
    replyTo: cleanHeader(formatAddresses(parsed.replyTo)),
    to: cleanHeader(formatAddresses(parsed.to)),
    subject: cleanHeader(parsed.subject),
    date: cleanHeader(parsed.headers.find((header) => header.key === "date")?.value ?? parsed.date),
  };

  const fromMailbox = mailboxes(parsed.from ? [parsed.from] : undefined)[0];
  const headerSignals: EmailHeaderSignals = {
    fromAddress: cleanHeader(fromMailbox?.address),
    fromName: cleanHeader(fromMailbox?.name),
    replyToAddresses: mailboxes(parsed.replyTo).map(({ address }) => address).filter(Boolean).slice(0, 10),
    messageId: cleanHeader(parsed.messageId),
    authentication: extractAuthentication(parsed.headers),
  };

  const headerLines = [
    metadata.from && `From: ${metadata.from}`,
    metadata.replyTo && `Reply-To: ${metadata.replyTo}`,
    metadata.to && `To: ${metadata.to}`,
    metadata.subject && `Subject: ${metadata.subject}`,
    metadata.date && `Date: ${metadata.date}`,
  ].filter((line): line is string => Boolean(line));

  const content = [...headerLines, headerLines.length > 0 ? "" : null, body]
    .filter((line): line is string => line !== null)
    .join("\n");

  if (content.length > MAX_EML_READABLE_TEXT_CHARACTERS) {
    throw new Error("This .eml file contains too much readable text. Choose a smaller file.");
  }

  return {
    content,
    metadata,
    attachments: parsed.attachments.slice(0, 50).map((attachment, index) => ({
      filename: cleanAttachmentName(attachment.filename, index),
      mimeType: cleanHeader(attachment.mimeType) ?? "unknown type",
      size: typeof attachment.content === "string"
        ? new TextEncoder().encode(attachment.content).byteLength
        : attachment.content.byteLength,
    })),
    bodySource: plainBody ? "text" : "html",
    headerSignals,
  };
}

export async function readEmlFile(file: ReadableEmlFile) {
  validateEmlFile(file);

  let rawEmail: string;

  try {
    rawEmail = await file.text();
  } catch {
    throw new Error("CyberFish could not read this file. Try choosing it again.");
  }

  if (!rawEmail.trim()) {
    throw new Error("This .eml file is empty. Choose a file that contains an email.");
  }

  return parseEmlContent(rawEmail);
}

export function formatEmlFileSize(size: number) {
  if (size < 1_000) return `${size} B`;
  if (size < 1_000_000) return `${(size / 1_000).toFixed(size < 10_000 ? 1 : 0)} KB`;
  return `${(size / 1_000_000).toFixed(size < 10_000_000 ? 1 : 0)} MB`;
}
