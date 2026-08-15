"use client";

import { FormEvent, useState } from "react";
import { analyzeUrlLocally } from "../../lib/analyze-url";
import type { AnalysisResult } from "../../lib/analysis";

const LinkIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.2 13.8a4.5 4.5 0 0 0 6.36.06l2.3-2.3a4.5 4.5 0 0 0-6.36-6.36l-1.32 1.32M13.8 10.2a4.5 4.5 0 0 0-6.36-.06l-2.3 2.3a4.5 4.5 0 0 0 6.36 6.36l1.31-1.31" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
const StatusIcon = ({ positive }: { positive: boolean }) => positive
  ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8" /></svg>
  : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v6M12 17v.1" /></svg>;

export default function UrlAnalyzer() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);

    try {
      setResult(analyzeUrlLocally(value));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This URL could not be checked.");
    }
  }

  return (
    <div className={`analyzer-card ${result ? "has-result" : ""}`} id="analyzer">
      <form aria-label="URL analyzer" onSubmit={submit} noValidate>
        <label className="analyzer-title" htmlFor="url">Check a link in seconds</label>
        <div className={`url-field ${error ? "field-error" : ""}`}><LinkIcon /><input id="url" name="url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck="false" placeholder="Paste the suspicious URL here" value={value} onChange={(event) => setValue(event.target.value)} aria-describedby={error ? "url-error" : "url-help"} aria-invalid={Boolean(error)} /></div>
        {error && <p className="form-error" id="url-error" role="alert">{error}</p>}
        <button type="submit">Check link <ArrowIcon /></button>
      </form>
      <p className="preview-note" id="url-help"><LockIcon /> Checked locally · Nothing is uploaded or saved</p>

      {result && (
        <section className={`live-result result-${result.level}`} aria-live="polite" aria-label="URL analysis result">
          <div className="live-result-heading">
            <div><span>{result.level} risk</span><strong>{result.score}<small>/100</small></strong></div>
            <div><p>{result.hostname}</p><h2>{result.summary}</h2></div>
          </div>
          <ul>
            {result.evidence.map((item) => <li className={item.severity} key={item.title}><span><StatusIcon positive={item.severity === "positive"} /></span><div><strong>{item.title}</strong><small>{item.description}</small></div></li>)}
          </ul>
          <div className="result-advice"><strong>What to do next</strong>{result.recommendations.map((item) => <p key={item}>{item}</p>)}</div>
          <small className="result-disclaimer">{result.disclaimer}</small>
        </section>
      )}
    </div>
  );
}
