import type { AnalysisEvidence, AnalysisResult, RiskLevel } from "./analysis";
import { parse } from "tldts";

const SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd", "buff.ly", "cutt.ly", "rebrand.ly",
]);

const SUSPICIOUS_WORDS = [
  "login", "signin", "verify", "secure", "account", "update", "wallet", "payment", "bank", "support",
];

const IPV4_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function containsEmbeddedDomain(hostname: string) {
  const parsedHostname = parse(hostname, { allowPrivateDomains: false });
  if (!parsedHostname.domain || !parsedHostname.subdomain) return false;

  const labels = parsedHostname.subdomain.split(".");
  for (let start = 0; start < labels.length - 1; start += 1) {
    for (let end = start + 1; end < labels.length; end += 1) {
      const candidate = labels.slice(start, end + 1).join(".");
      const parsedCandidate = parse(candidate, { allowPrivateDomains: false });
      if (parsedCandidate.isIcann && parsedCandidate.domain === candidate && !parsedCandidate.subdomain) {
        return true;
      }
    }
  }
  return false;
}

function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "dangerous";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function summaryFor(level: RiskLevel) {
  const summaries: Record<RiskLevel, string> = {
    low: "No obvious structural warning signs were found.",
    medium: "A few details deserve a closer look.",
    high: "Several structural warning signs were detected.",
    dangerous: "This address contains strong phishing indicators.",
  };
  return summaries[level];
}

export function analyzeUrlLocally(input: string): AnalysisResult {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a URL to check.");
  if (trimmed.length > 2048) throw new Error("The URL is too long. Enter an address under 2,048 characters.");

  const candidate = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Enter a complete web address, such as https://example.com.");
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
    throw new Error("Only HTTP and HTTPS web addresses can be checked.");
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const evidence: AnalysisEvidence[] = [];
  let score = 0;

  const add = (points: number, item: AnalysisEvidence) => {
    score += points;
    evidence.push(item);
  };

  if (url.protocol === "http:") {
    add(15, { title: "No HTTPS encryption", description: "Information sent to this address may not be encrypted.", severity: "warning" });
  } else {
    evidence.push({ title: "Uses HTTPS", description: "The connection can be encrypted, but HTTPS alone does not prove a site is trustworthy.", severity: "positive" });
  }

  if (IPV4_PATTERN.test(hostname) || hostname.includes(":")) {
    add(35, { title: "IP address instead of a domain", description: "Phishing links sometimes hide behind a direct server address.", severity: "danger" });
  }

  if (hostname.includes("xn--")) {
    add(25, { title: "Encoded international domain", description: "The address uses Punycode and could imitate familiar letters.", severity: "danger" });
  }

  if (url.username || url.password) {
    add(30, { title: "Misleading text before the domain", description: "The address contains account-style text that can disguise the real destination.", severity: "danger" });
  }

  if (SHORTENERS.has(hostname)) {
    add(22, { title: "Shortened link", description: "The final destination is hidden until the link is expanded.", severity: "warning" });
  }

  const labels = hostname.split(".");
  if (labels.length > 4) {
    add(14, { title: "Many subdomains", description: "A long chain of subdomains can make the real domain harder to notice.", severity: "warning" });
  }

  if (containsEmbeddedDomain(hostname)) {
    add(25, {
      title: "Domain-like text hidden in the subdomain",
      description: "A familiar-looking domain appears before the real destination. Attackers can use this pattern to make a different website look legitimate.",
      severity: "danger",
    });
  }

  const matchedWords = SUSPICIOUS_WORDS.filter((word) => hostname.includes(word));
  if (matchedWords.length) {
    add(Math.min(24, matchedWords.length * 8), { title: "Sensitive words in the domain", description: `The address uses ${matchedWords.slice(0, 3).join(", ")}, which are common in account-themed scams.`, severity: "warning" });
  }

  if ((hostname.match(/-/g) ?? []).length >= 3) {
    add(10, { title: "Unusually hyphenated domain", description: "Several hyphens can be used to imitate a legitimate brand address.", severity: "warning" });
  }

  if (trimmed.length > 120) {
    add(10, { title: "Very long URL", description: "Important destination details may be hidden inside the long address.", severity: "warning" });
  }

  if (url.port && !["80", "443"].includes(url.port)) {
    add(10, { title: "Unusual network port", description: `The address uses port ${url.port}, which is uncommon for a normal public website.`, severity: "warning" });
  }

  const encodedParts = (trimmed.match(/%[0-9a-fA-F]{2}/g) ?? []).length;
  if (encodedParts >= 4) {
    add(10, { title: "Heavily encoded address", description: "Several characters are hidden in encoded form, making the URL harder to read.", severity: "warning" });
  }

  if (evidence.length === 1 && evidence[0].severity === "positive") {
    evidence.push({ title: "Readable domain structure", description: "No obvious IP address, link shortener, or excessive subdomain pattern was detected.", severity: "positive" });
  }

  score = Math.min(100, score);
  const level = riskLevel(score);
  const recommendations = level === "low"
    ? ["Confirm the domain belongs to the organization you expect.", "Avoid entering sensitive information if the message was unexpected."]
    : ["Do not sign in, pay, or download anything from this link.", "Contact the organization through an official app or website you already trust."];

  return {
    score,
    level,
    summary: summaryFor(level),
    hostname,
    evidence: evidence.slice(0, 6),
    recommendations,
    disclaimer: "This local check looks only at the URL structure. It does not guarantee that a link is safe.",
  };
}
