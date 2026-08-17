"use client";

import { FormEvent, useState } from "react";
import type { EmailAnalysisResult } from "../../lib/analysis";
import AnalysisResultView from "./analysis-result";

const MailIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;

export default function EmailAnalyzer() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useAi, setUseAi] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch("/api/analyze/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value, useAi }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "The email could not be analyzed. Try again.");
      }

      setResult(data as EmailAnalysisResult);
    } catch (caught) {
      const message = caught instanceof Error && caught.name === "AbortError"
        ? "The analysis took too long. Try again."
        : caught instanceof Error ? caught.message : "The email could not be analyzed. Try again.";
      setError(message);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  }

  return (
    <div className="email-analyzer">
      <form aria-label="Email analyzer" onSubmit={submit} noValidate>
        <label className="analyzer-title" htmlFor="email-content">Paste the full email</label>
        <p className="analyzer-intro">Copy the sender, subject, message, and any visible links from your email app, then paste them below.</p>
        <p className="email-upload-note">File upload is planned for a future version.</p>
        <div className={`email-field ${error ? "field-error" : ""}`}>
          <MailIcon />
          <textarea
            id="email-content"
            name="email-content"
            placeholder="Paste the suspicious email here"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError("");
              if (result) setResult(null);
            }}
            aria-describedby={error ? "email-error" : "email-help"}
            aria-invalid={Boolean(error)}
            disabled={isLoading}
          />
        </div>
        <div className={`ai-option ${useAi ? "ai-option-active" : ""}`}>
          <label className="ai-toggle" htmlFor="email-use-ai">
            <input
              id="email-use-ai"
              type="checkbox"
              checked={useAi}
              onChange={(event) => {
                setUseAi(event.target.checked);
                if (error) setError("");
                if (result) setResult(null);
              }}
              aria-describedby="email-ai-privacy"
              disabled={isLoading}
            />
            <span><strong>Use AI analysis</strong><small>Optional · Off by default</small></span>
          </label>
          <p id="email-ai-privacy">{useAi
            ? "Your email text will be sent to Google Gemini for processing. CyberFish does not store it."
            : "Keep this off to analyze the email locally without sending it to an AI provider."}</p>
        </div>
        {error && <p className="form-error" id="email-error" role="alert">{error}</p>}
        <button className="analyzer-submit" type="submit" disabled={isLoading} aria-busy={isLoading}>{isLoading ? (useAi ? "Analyzing with AI…" : "Analyzing locally…") : "Analyze email"} {isLoading ? <span className="button-spinner" aria-hidden="true" /> : <ArrowIcon />}</button>
      </form>
      <p className="preview-note" id="email-help"><LockIcon /> {useAi ? "AI-assisted analysis · Not stored by CyberFish" : "Local analysis · Not stored or shared"}</p>
      {result && <AnalysisResultView
        result={result}
        label={`${result.detectedLinks.length} link${result.detectedLinks.length === 1 ? "" : "s"} found`}
        ariaLabel="Email analysis result"
        showEvidenceSources
        statusNotice={result.aiAnalysis?.status === "unavailable"
          ? { tone: "warning", text: result.aiAnalysis.message }
          : result.aiAnalysis?.status === "completed"
            ? { tone: "info", text: result.aiAnalysis.message }
            : undefined}
      />}
    </div>
  );
}
