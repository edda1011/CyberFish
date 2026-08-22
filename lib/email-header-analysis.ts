import { getDomain } from "tldts";
import type { AnalysisEvidence } from "./analysis";

export type EmailAuthenticationMethod = "spf" | "dkim" | "dmarc";
export type EmailAuthenticationStatus = "pass" | "fail" | "softfail" | "neutral" | "none" | "temperror" | "permerror" | "unknown";

export interface EmailHeaderSignals {
  fromAddress?: string;
  fromName?: string;
  replyToAddresses: string[];
  messageId?: string;
  authentication: Partial<Record<EmailAuthenticationMethod, EmailAuthenticationStatus>>;
}

type WeightedEvidence = AnalysisEvidence & { points: number };

const AUTHENTICATION_POINTS: Record<EmailAuthenticationMethod, number> = {
  dmarc: 30,
  dkim: 18,
  spf: 16,
};

const AUTHENTICATION_LABELS: Record<EmailAuthenticationMethod, string> = {
  dmarc: "DMARC",
  dkim: "DKIM",
  spf: "SPF",
};

const IMPERSONATED_BRANDS: Array<{ pattern: RegExp; domains: string[]; label: string }> = [
  { pattern: /\bpaypal\b/i, domains: ["paypal.com"], label: "PayPal" },
  { pattern: /\bmicrosoft\b/i, domains: ["microsoft.com", "microsoftonline.com", "outlook.com"], label: "Microsoft" },
  { pattern: /\bgoogle\b/i, domains: ["google.com", "gmail.com"], label: "Google" },
  { pattern: /\bapple\b/i, domains: ["apple.com", "icloud.com"], label: "Apple" },
  { pattern: /\bamazon\b/i, domains: ["amazon.com", "amazon.co.uk"], label: "Amazon" },
];

function addressDomain(address: string | undefined) {
  if (!address || !address.includes("@")) return undefined;
  const hostname = address.slice(address.lastIndexOf("@") + 1).trim().replace(/[>\s]+$/g, "").toLowerCase();
  return getDomain(hostname, { allowPrivateDomains: false }) ?? hostname;
}

function messageIdDomain(messageId: string | undefined) {
  if (!messageId) return undefined;
  const match = messageId.match(/@([^>\s]+)>?$/);
  return match ? addressDomain(`message@${match[1]}`) : undefined;
}

function isShortString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 320;
}

const AUTHENTICATION_STATUSES = new Set<EmailAuthenticationStatus>([
  "pass", "fail", "softfail", "neutral", "none", "temperror", "permerror", "unknown",
]);

export function isEmailHeaderSignals(value: unknown): value is EmailHeaderSignals {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (candidate.fromAddress !== undefined && !isShortString(candidate.fromAddress)) return false;
  if (candidate.fromName !== undefined && !isShortString(candidate.fromName)) return false;
  if (candidate.messageId !== undefined && !isShortString(candidate.messageId)) return false;
  if (!Array.isArray(candidate.replyToAddresses) || candidate.replyToAddresses.length > 10 || !candidate.replyToAddresses.every(isShortString)) return false;
  if (!candidate.authentication || typeof candidate.authentication !== "object" || Array.isArray(candidate.authentication)) return false;

  const authentication = candidate.authentication as Record<string, unknown>;
  return Object.entries(authentication).every(([method, status]) =>
    ["spf", "dkim", "dmarc"].includes(method)
    && typeof status === "string"
    && AUTHENTICATION_STATUSES.has(status as EmailAuthenticationStatus));
}

export function analyzeEmailHeaders(signals: EmailHeaderSignals) {
  const findings: WeightedEvidence[] = [];
  let points = 0;

  const authenticationEntries = (Object.keys(AUTHENTICATION_POINTS) as EmailAuthenticationMethod[])
    .map((method) => [method, signals.authentication[method]] as const)
    .filter((entry): entry is readonly [EmailAuthenticationMethod, EmailAuthenticationStatus] => Boolean(entry[1]));

  for (const [method, status] of authenticationEntries) {
    if (status !== "fail") continue;
    const methodPoints = AUTHENTICATION_POINTS[method];
    const article = method === "spf" ? "an" : "a";
    points += methodPoints;
    findings.push({
      points: methodPoints,
      title: `${AUTHENTICATION_LABELS[method]} authentication failed`,
      description: `The imported email reports ${article} ${AUTHENTICATION_LABELS[method]} failure. Verify the sender through an official channel.`,
      severity: method === "dmarc" ? "danger" : "warning",
    });
  }

  if (authenticationEntries.length === 0) {
    findings.push({
      points: 0,
      title: "Email authentication data unavailable",
      description: "The imported file does not include SPF, DKIM, or DMARC results. Missing data is not proof that the message is unsafe.",
      severity: "warning",
    });
  } else if (authenticationEntries.every(([, status]) => status === "pass")) {
    findings.push({
      points: 0,
      title: "Reported email authentication passed",
      description: "The imported email reports passing authentication checks, but this alone does not guarantee the message is trustworthy.",
      severity: "positive",
    });
  } else if (!authenticationEntries.some(([, status]) => status === "fail")) {
    findings.push({
      points: 0,
      title: "Email authentication was not fully confirmed",
      description: "The imported email includes an inconclusive authentication result. Verify the sender independently.",
      severity: "warning",
    });
  }

  const fromDomain = addressDomain(signals.fromAddress);
  const replyDomains = [...new Set(signals.replyToAddresses.map(addressDomain).filter((domain): domain is string => Boolean(domain)))];
  const differentReplyDomain = fromDomain && replyDomains.find((domain) => domain !== fromDomain);
  if (differentReplyDomain) {
    points += 18;
    findings.push({
      points: 18,
      title: "Reply address uses a different domain",
      description: `Replies would go to ${differentReplyDomain}, not the sender domain ${fromDomain}. Confirm that this difference is expected.`,
      severity: "warning",
    });
  }

  const idDomain = messageIdDomain(signals.messageId);
  if (fromDomain && idDomain && idDomain !== fromDomain) {
    points += 10;
    findings.push({
      points: 10,
      title: "Message ID uses a different domain",
      description: `The Message-ID domain ${idDomain} differs from the sender domain ${fromDomain}. This can be legitimate, but deserves verification.`,
      severity: "warning",
    });
  }

  const claimedBrand = signals.fromName && IMPERSONATED_BRANDS.find(({ pattern }) => pattern.test(signals.fromName ?? ""));
  if (claimedBrand && fromDomain && !claimedBrand.domains.includes(fromDomain)) {
    points += 18;
    findings.push({
      points: 18,
      title: "Sender name may imitate a known brand",
      description: `The display name mentions ${claimedBrand.label}, but the sender uses ${fromDomain}. Verify the address through the brand's official website or app.`,
      severity: "warning",
    });
  }

  return {
    points: Math.min(50, points),
    evidence: findings.sort((a, b) => b.points - a.points),
  };
}
