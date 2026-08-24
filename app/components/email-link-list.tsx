"use client";

import { useEffect, useRef, useState } from "react";
import type { EmailAnalysisResult } from "../../lib/analysis";

type CopyState = { url: string; status: "copied" | "failed" } | null;

const CopyIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>;

export default function EmailLinkList({ result }: { result: EmailAnalysisResult }) {
  const [copyState, setCopyState] = useState<CopyState>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  if (result.detectedLinkDetails.length === 0) return null;

  async function copyAddress(url: string) {
    if (resetTimer.current) clearTimeout(resetTimer.current);

    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setCopyState({ url, status: "copied" });
    } catch {
      setCopyState({ url, status: "failed" });
    }

    resetTimer.current = setTimeout(() => setCopyState(null), 2_000);
  }

  return (
    <section className="email-link-list" aria-labelledby="email-links-heading">
      <div className="email-link-list-heading">
        <div>
          <h3 id="email-links-heading">Links found in this email</h3>
          <p>Addresses are shown as text and will not open when selected.</p>
        </div>
        <span>{result.detectedLinkCount}</span>
      </div>
      <ol>
        {result.detectedLinkDetails.map((link, index) => {
          const currentState = copyState?.url === link.url ? copyState.status : null;
          return (
            <li key={`${link.url}-${index}`}>
              <div className="email-link-domain">
                <strong>{link.hostname}</strong>
                <small data-level={link.level}>{link.level} risk</small>
              </div>
              <code>{link.url}</code>
              <div className="email-link-meta">
                <div>{link.warnings.length > 0
                  ? link.warnings.map((warning) => <span key={warning}>{warning}</span>)
                  : <span data-positive="true">No obvious structural warning</span>}</div>
                <button
                  type="button"
                  onClick={() => copyAddress(link.url)}
                  aria-label={currentState === "copied" ? `Address for ${link.hostname} copied` : `Copy address for ${link.hostname}`}
                >
                  <CopyIcon /> {currentState === "copied" ? "Copied" : "Copy address"}
                </button>
              </div>
              {currentState === "failed" && <p className="email-link-copy-error" role="alert">Copying was blocked. Select the address above and copy it manually.</p>}
            </li>
          );
        })}
      </ol>
      {result.detectedLinkCount > result.detectedLinkDetails.length && (
        <p className="email-link-overflow">And {result.detectedLinkCount - result.detectedLinkDetails.length} more link{result.detectedLinkCount - result.detectedLinkDetails.length === 1 ? "" : "s"} not shown.</p>
      )}
      <p className="email-link-safety">CyberFish checked address structure only. It did not open these links.</p>
    </section>
  );
}
