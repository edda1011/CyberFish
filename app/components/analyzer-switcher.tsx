"use client";

import { useState } from "react";
import type { KeyboardEvent } from "react";
import EmailAnalyzer from "./email-analyzer";
import UrlAnalyzer from "./url-analyzer";

type AnalyzerMode = "url" | "email";

export default function AnalyzerSwitcher() {
  const [mode, setMode] = useState<AnalyzerMode>("url");

  function selectWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const nextMode = mode === "url" ? "email" : "url";
    setMode(nextMode);
    document.getElementById(`${nextMode}-tab`)?.focus();
  }

  return (
    <div className="analyzer-card" id="analyzer">
      <div className="analyzer-tabs" role="tablist" aria-label="Choose what to analyze">
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
      </div>

      <div id="url-panel" role="tabpanel" aria-labelledby="url-tab" hidden={mode !== "url"}>
        <UrlAnalyzer />
      </div>
      <div id="email-panel" role="tabpanel" aria-labelledby="email-tab" hidden={mode !== "email"}>
        <EmailAnalyzer />
      </div>
    </div>
  );
}
