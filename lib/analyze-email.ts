import { analyzeUrlLocally } from "./analyze-url";
import type { AnalysisEvidence, EmailAnalysisResult, RiskLevel } from "./analysis";

type WeightedEvidence = AnalysisEvidence & { points: number };

const EMAIL_RULES: Array<{ pattern: RegExp; excludePattern?: RegExp; points: number; evidence: AnalysisEvidence }> = [
  {
    pattern: /\b(urgent|immediately|act now|action required|final warning|within \d+ hours?|expires? today|limited time)\b/i,
    points: 14,
    evidence: { title: "Urgent pressure", description: "The message pushes you to act quickly before you can verify it.", severity: "warning" },
  },
  {
    pattern: /(?:\b(send|share|provide|enter|submit|reply with)\b.{0,40}\b(password|passcode|one[- ]time password|otp|verification code|security code)\b)|(?:\b(password|passcode|one[- ]time password|otp|verification code|security code)\b.{0,40}\b(send|share|provide|enter|submit|reply)\b)|\b(login credentials|confirm your identity|verify your account)\b/i,
    excludePattern: /\b(never|do not|don't)\s+(share|send|provide).{0,30}\b(password|passcode|one[- ]time password|otp|verification code|security code|code)\b/i,
    points: 28,
    evidence: { title: "Requests sensitive access details", description: "Legitimate organizations should not ask you to send passwords or verification codes by email.", severity: "danger" },
  },
  {
    pattern: /\b(gift cards?|wire transfer|bank transfer|cryptocurrency|bitcoin|payment required|outstanding payment|pay immediately|send money)\b/i,
    points: 24,
    evidence: { title: "Unusual payment request", description: "The message asks for a payment method commonly used in scams.", severity: "danger" },
  },
  {
    pattern: /\b(bank|tax (office|department|authority)|government|police|delivery (company|service)|courier|technical support|it support|microsoft support)\b/i,
    points: 12,
    evidence: { title: "Claims to represent a trusted organization", description: "Verify the sender through an official app, website, or phone number before acting.", severity: "warning" },
  },
  {
    pattern: /\b(you (have )?won|winner|claim (your )?(prize|reward|refund)|lottery|free gift|unexpected refund)\b/i,
    points: 18,
    evidence: { title: "Unexpected reward or refund", description: "Prize and refund promises are often used to make people click or provide information.", severity: "warning" },
  },
  {
    pattern: /\b(do not tell|keep this confidential|do not contact|don't contact|secret transaction)\b/i,
    points: 20,
    evidence: { title: "Asks for secrecy", description: "Scammers may discourage you from checking the request with someone you trust.", severity: "danger" },
  },
  {
    pattern: /\b(account (will be )?(closed|suspended|locked)|legal action|you will be arrested|service will be terminated)\b/i,
    points: 18,
    evidence: { title: "Threatens a negative consequence", description: "The message uses fear to pressure you into acting without verification.", severity: "warning" },
  },
  {
    pattern: /\b(enable macros?|download (the )?attachment|open (the )?attachment|install (this )?(app|software|update))\b/i,
    points: 25,
    evidence: { title: "Risky download instruction", description: "Unexpected attachments, macros, and software installs can deliver malware.", severity: "danger" },
  },
];

function riskLevel(score: number): RiskLevel {
  if (score >= 70) return "dangerous";
  if (score >= 45) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function summaryFor(level: RiskLevel) {
  const summaries: Record<RiskLevel, string> = {
    low: "No obvious warning signs were found in this email text.",
    medium: "A few details in this email deserve a closer look.",
    high: "Several phishing warning signs were detected in this email.",
    dangerous: "This email contains strong phishing or scam indicators.",
  };
  return summaries[level];
}

function extractUrls(input: string) {
  return [...new Set(input.match(/https?:\/\/[^\s<>"']+/gi) ?? [])]
    .map((url) => url.replace(/[),.;!?\]]+$/, ""))
    .slice(0, 10);
}

export function analyzeEmailLocally(input: string): EmailAnalysisResult {
  const text = input.trim();
  if (!text) throw new Error("Paste the email text you want to check.");
  if (text.length > 50_000) throw new Error("The email is too long. Paste text under 50,000 characters.");

  const findings: WeightedEvidence[] = [];
  let score = 0;

  for (const rule of EMAIL_RULES) {
    if (!rule.pattern.test(text) || rule.excludePattern?.test(text)) continue;
    score += rule.points;
    findings.push({ ...rule.evidence, points: rule.points });
  }

  const detectedLinks = extractUrls(text);
  let highestUrlRisk = 0;
  let riskyLink = "";

  for (const link of detectedLinks) {
    try {
      const linkResult = analyzeUrlLocally(link);
      if (linkResult.score > highestUrlRisk) {
        highestUrlRisk = linkResult.score;
        riskyLink = linkResult.hostname;
      }
    } catch {
      // Ignore incomplete text fragments that only resemble URLs.
    }
  }

  if (highestUrlRisk > 0) {
    const linkPoints = Math.min(40, highestUrlRisk);
    score += linkPoints;
    findings.push({
      points: linkPoints,
      title: "Suspicious link structure",
      description: `${riskyLink} contains structural warning signs. CyberFish did not open the link.`,
      severity: highestUrlRisk >= 35 ? "danger" : "warning",
    });
  } else if (detectedLinks.length > 0) {
    findings.push({
      points: 0,
      title: "Links need independent verification",
      description: "The visible link structure has no obvious local warning, but that does not prove the destination is safe.",
      severity: "positive",
    });
  }

  if (findings.length === 0) {
    findings.push({
      points: 0,
      title: "No common scam phrases detected",
      description: "The text did not match the English warning patterns checked in this version.",
      severity: "positive",
    });
  }

  score = Math.min(100, score);
  const level = riskLevel(score);
  const evidence = findings
    .sort((a, b) => b.points - a.points)
    .slice(0, 6)
    .map(({ points: _points, ...item }) => item);

  const recommendations = level === "low"
    ? ["Confirm the sender through a channel you already trust.", "Treat unexpected links and attachments carefully even when no warning is shown."]
    : ["Do not reply, click links, download files, make payments, or share codes.", "Contact the organization using its official app, website, or a trusted phone number."];

  return {
    score,
    level,
    summary: summaryFor(level),
    evidence,
    recommendations,
    detectedLinks,
    disclaimer: "This local check looks for common English scam patterns and URL structure. It does not guarantee that an email is safe.",
  };
}
