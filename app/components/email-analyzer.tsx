"use client";

import { FormEvent, useState } from "react";
import { analyzeEmailLocally } from "../../lib/analyze-email";
import type { EmailAnalysisResult } from "../../lib/analysis";
import AnalysisResultView from "./analysis-result";

const MailIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;

export default function EmailAnalyzer() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    try {
      setResult(analyzeEmailLocally(value));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The email could not be analyzed. Try again.");
    }
  }

  return (
    <div className="email-analyzer">
      <form aria-label="Email analyzer" onSubmit={submit} noValidate>
        <label className="analyzer-title" htmlFor="email-content">Paste the full email</label>
        <p className="analyzer-intro">Include the sender, subject, message, and any links you can see.</p>
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
          />
        </div>
        {error && <p className="form-error" id="email-error" role="alert">{error}</p>}
        <button className="analyzer-submit" type="submit">Analyze email <ArrowIcon /></button>
      </form>
      <p className="preview-note" id="email-help"><LockIcon /> Analyzed in your browser · Not stored or sent anywhere</p>
      {result && <AnalysisResultView result={result} label={`${result.detectedLinks.length} link${result.detectedLinks.length === 1 ? "" : "s"} found`} ariaLabel="Email analysis result" />}
    </div>
  );
}
