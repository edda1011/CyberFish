import type { BaseAnalysisResult } from "../../lib/analysis";

const StatusIcon = ({ positive }: { positive: boolean }) => positive
  ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.5 3.5 3.5 7.5-8" /></svg>
  : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v6M12 17v.1" /></svg>;

type AnalysisResultViewProps = {
  result: BaseAnalysisResult;
  label: string;
  ariaLabel: string;
  advisoryUrl?: string;
  showEvidenceSources?: boolean;
  statusNotice?: { tone: "info" | "warning"; text: string };
};

export default function AnalysisResultView({ result, label, ariaLabel, advisoryUrl, showEvidenceSources = false, statusNotice }: AnalysisResultViewProps) {
  return (
    <section className={`live-result result-${result.level}`} aria-live="polite" aria-label={ariaLabel}>
      <div className="live-result-heading">
        <div><span>{result.level} risk</span><strong>{result.score}<small>/100</small></strong></div>
        <div><p>{label}</p><h2>{result.summary}</h2></div>
      </div>
      {statusNotice && <p className={`result-status result-status-${statusNotice.tone}`}>{statusNotice.text}</p>}
      <ul>
        {result.evidence.map((item, index) => <li className={item.severity} key={`${item.source ?? "local"}-${item.title}-${index}`}><span><StatusIcon positive={item.severity === "positive"} /></span><div><strong>{item.title}{showEvidenceSources && <em className={`evidence-source evidence-source-${item.source ?? "local"}`}>{item.source === "ai" ? "AI-assisted" : "Local"}</em>}</strong><small>{item.description}</small></div></li>)}
      </ul>
      <div className="result-advice"><strong>What to do next</strong>{result.recommendations.map((item) => <p key={item}>{item}</p>)}</div>
      <small className="result-disclaimer">{result.disclaimer}</small>
      {advisoryUrl && <a className="intel-advisory" href={advisoryUrl} target="_blank" rel="noreferrer">Advisory provided by Google</a>}
    </section>
  );
}
