import type { AnalysisEvidence, EmailAnalysisResult, EvidenceSeverity, RiskLevel } from "./analysis";

export const EMAIL_AI_CATEGORIES = [
  "impersonation",
  "urgency_manipulation",
  "credential_request",
  "payment_request",
  "secrecy_pressure",
  "threat_pressure",
  "reward_lure",
  "risky_attachment",
  "other_social_engineering",
] as const;

export type EmailAiCategory = (typeof EMAIL_AI_CATEGORIES)[number];

export interface EmailAiFinding {
  category: EmailAiCategory;
  reason: string;
}

export interface EmailAiResult {
  findings: EmailAiFinding[];
}

type CategoryPolicy = {
  title: string;
  points: number;
  severity: Exclude<EvidenceSeverity, "positive">;
};

const CATEGORY_POLICIES: Record<EmailAiCategory, CategoryPolicy> = {
  impersonation: { title: "Possible impersonation", points: 8, severity: "warning" },
  urgency_manipulation: { title: "Manipulative urgency", points: 5, severity: "warning" },
  credential_request: { title: "Sensitive information request", points: 12, severity: "danger" },
  payment_request: { title: "Suspicious payment request", points: 12, severity: "danger" },
  secrecy_pressure: { title: "Pressure to keep the request secret", points: 8, severity: "danger" },
  threat_pressure: { title: "Threat or fear-based pressure", points: 7, severity: "warning" },
  reward_lure: { title: "Unexpected reward or benefit", points: 6, severity: "warning" },
  risky_attachment: { title: "Risky attachment instruction", points: 10, severity: "danger" },
  other_social_engineering: { title: "Social engineering pattern", points: 5, severity: "warning" },
};

const MAX_FINDINGS = 3;
const MAX_REASON_LENGTH = 240;
const MAX_AI_SCORE = 20;
const MAX_VISIBLE_EVIDENCE = 6;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCategory(value: unknown): value is EmailAiCategory {
  return typeof value === "string" && EMAIL_AI_CATEGORIES.some((category) => category === value);
}

export function parseEmailAiResult(value: unknown): EmailAiResult | null {
  if (!isRecord(value) || !Array.isArray(value.findings) || value.findings.length > MAX_FINDINGS) {
    return null;
  }

  const findings: EmailAiFinding[] = [];
  const seenCategories = new Set<EmailAiCategory>();

  for (const candidate of value.findings) {
    if (!isRecord(candidate) || !isCategory(candidate.category) || typeof candidate.reason !== "string") {
      return null;
    }

    const reason = candidate.reason.trim();
    if (!reason || reason.length > MAX_REASON_LENGTH || seenCategories.has(candidate.category)) {
      return null;
    }

    seenCategories.add(candidate.category);
    findings.push({ category: candidate.category, reason });
  }

  return { findings };
}

function levelForScore(score: number): RiskLevel {
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

function recommendationsFor(level: RiskLevel) {
  return level === "low"
    ? ["Confirm the sender through a channel you already trust.", "Treat unexpected links and attachments carefully even when no warning is shown."]
    : ["Do not reply, click links, download files, make payments, or share codes.", "Contact the organization using its official app, website, or a trusted phone number."];
}

export function mergeEmailAiResult(local: EmailAnalysisResult, ai: EmailAiResult): EmailAnalysisResult {
  const availableSlots = Math.max(0, MAX_VISIBLE_EVIDENCE - local.evidence.length);
  const acceptedFindings = [...ai.findings]
    .sort((left, right) => CATEGORY_POLICIES[right.category].points - CATEGORY_POLICIES[left.category].points)
    .slice(0, availableSlots);
  let aiScore = 0;

  const aiEvidence: AnalysisEvidence[] = acceptedFindings.map((finding) => {
    const policy = CATEGORY_POLICIES[finding.category];
    aiScore += policy.points;

    return {
      title: policy.title,
      description: finding.reason,
      severity: policy.severity,
      source: "ai",
    };
  });

  const score = Math.min(100, local.score + Math.min(MAX_AI_SCORE, aiScore));
  const level = levelForScore(score);

  return {
    ...local,
    score,
    level,
    summary: summaryFor(level),
    evidence: [...local.evidence, ...aiEvidence],
    recommendations: recommendationsFor(level),
    disclaimer: "This check combines local patterns with optional AI-assisted semantic analysis. It does not guarantee that an email is safe.",
    aiAnalysis: {
      status: "completed",
      provider: "gemini",
      message: acceptedFindings.length > 0
        ? "Gemini contributed additional semantic evidence."
        : "Gemini found no additional evidence that could be added to this result.",
    },
  };
}
