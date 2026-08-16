"use client";

import { FormEvent, useState } from "react";
import type { AnalysisResult } from "../../lib/analysis";
import AnalysisResultView from "./analysis-result";

const LinkIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 13.8a4.5 4.5 0 0 0 6.36.06l2.3-2.3a4.5 4.5 0 0 0-6.36-6.36l-1.32 1.32M13.8 10.2a4.5 4.5 0 0 0-6.36-.06l-2.3 2.3a4.5 4.5 0 0 0 6.36 6.36l1.31-1.31" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;

export default function UrlAnalyzer() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message ?? "The URL could not be checked. Try again.");
      }

      setResult(data as AnalysisResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The URL could not be checked. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={`url-analyzer ${result ? "has-result" : ""}`}>
      <form aria-label="URL analyzer" onSubmit={submit} noValidate>
        <label className="analyzer-title" htmlFor="url">Check a link in seconds</label>
        <div className={`url-field ${error ? "field-error" : ""}`}><LinkIcon /><input id="url" name="url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="Paste the suspicious URL here" value={value} onChange={(event) => setValue(event.target.value)} aria-describedby={error ? "url-error" : "url-help"} aria-invalid={Boolean(error)} disabled={isLoading} /></div>
        {error && <p className="form-error" id="url-error" role="alert">{error}</p>}
        <button className="analyzer-submit" type="submit" disabled={isLoading} aria-busy={isLoading}>{isLoading ? "Checking…" : "Check link"} {isLoading ? <span className="button-spinner" aria-hidden="true" /> : <ArrowIcon />}</button>
      </form>
      <p className="preview-note" id="url-help"><LockIcon /> Not stored by CyberFish · Sent to Google Safe Browsing for a reputation check</p>

      {result && <AnalysisResultView result={result} label={result.hostname} ariaLabel="URL analysis result" advisoryUrl={result.threatIntelligence?.status === "match" ? result.threatIntelligence.advisoryUrl : undefined} />}
    </div>
  );
}
