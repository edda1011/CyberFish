"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import EmailAnalyzer from "./email-analyzer";
import QrAnalyzer from "./qr-analyzer";
import UrlAnalyzer from "./url-analyzer";

const ANALYZER_MODES = ["url", "email", "qr"] as const;
type AnalyzerMode = (typeof ANALYZER_MODES)[number];

export default function AnalyzerSwitcher() {
  const [mode, setMode] = useState<AnalyzerMode>("url");

  function selectWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const currentIndex = ANALYZER_MODES.indexOf(mode);
    const nextMode = ANALYZER_MODES[(currentIndex + direction + ANALYZER_MODES.length) % ANALYZER_MODES.length];
    setMode(nextMode);
    document.getElementById(`${nextMode}-tab`)?.focus();
  }

  return (
    <div className="analyzer-card" id="analyzer">
      <div className="analyzer-tabs" data-mode={mode} role="tablist" aria-label="Choose what to analyze">
        <button
          type="button"
          role="tab"
          id="url-tab"
          aria-selected={mode === "url"}
          aria-controls="url-panel"
          tabIndex={mode === "url" ? 0 : -1}
          onClick={() => setMode("url")}
          onKeyDown={selectWithKeyboard}
        >
          Check a link
        </button>
        <button
          type="button"
          role="tab"
          id="email-tab"
          aria-selected={mode === "email"}
          aria-controls="email-panel"
          tabIndex={mode === "email" ? 0 : -1}
          onClick={() => setMode("email")}
          onKeyDown={selectWithKeyboard}
        >
          Analyze an email
        </button>
        <button
          type="button"
          role="tab"
          id="qr-tab"
          aria-selected={mode === "qr"}
          aria-controls="qr-panel"
          tabIndex={mode === "qr" ? 0 : -1}
          onClick={() => setMode("qr")}
          onKeyDown={selectWithKeyboard}
        >
          Scan a QR code
        </button>
      </div>

      <div className="analyzer-panel" id="url-panel" role="tabpanel" aria-labelledby="url-tab" hidden={mode !== "url"}>
        <UrlAnalyzer />
      </div>
      <div className="analyzer-panel" id="email-panel" role="tabpanel" aria-labelledby="email-tab" hidden={mode !== "email"}>
        <EmailAnalyzer />
      </div>
      <div className="analyzer-panel" id="qr-panel" role="tabpanel" aria-labelledby="qr-tab" hidden={mode !== "qr"}>
        <QrAnalyzer />
      </div>
    </div>
  );
}
