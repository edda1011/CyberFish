"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import type { EmailAnalysisResult } from "../../lib/analysis";
import { formatEmlFileSize, readEmlFile } from "../../lib/eml-file";
import type { ParsedEmlContent } from "../../lib/eml-file";
import { assessAttachment } from "../../lib/attachment-analysis";
import AnalysisResultView from "./analysis-result";

const MailIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
const UploadIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></svg>;
const FileIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 13h6M9 17h4" /></svg>;

export default function EmailAnalyzer() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<EmailAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [selectedFile, setSelectedFile] = useState<({ name: string; size: number } & ParsedEmlContent) | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function importEmlFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setResult(null);
    setIsReadingFile(true);

    try {
      const parsed = await readEmlFile(file);
      setValue(parsed.content);
      setSelectedFile({ name: file.name, size: file.size, ...parsed });
    } catch (caught) {
      setSelectedFile(null);
      setError(caught instanceof Error ? caught.message : "CyberFish could not read this file. Try choosing it again.");
    } finally {
      setIsReadingFile(false);
      event.target.value = "";
    }
  }

  function removeSelectedFile() {
    setSelectedFile(null);
    setValue("");
    setError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

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
        body: JSON.stringify({ content: value, useAi, ...(selectedFile ? { emailHeaders: selectedFile.headerSignals, attachments: selectedFile.attachments } : {}) }),
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
        <label className="analyzer-title" htmlFor="email-content">Paste or import an email</label>
        <p className="analyzer-intro">Paste the sender, subject, message, and visible links—or import a small .eml file.</p>
        <div className="email-import">
          <input
            ref={fileInputRef}
            className="visually-hidden"
            id="email-file"
            type="file"
            accept=".eml,message/rfc822"
            onChange={importEmlFile}
            disabled={isLoading || isReadingFile}
          />
          <label className="email-import-button" htmlFor="email-file" aria-disabled={isLoading || isReadingFile}>
            <UploadIcon /> {isReadingFile ? "Reading file…" : "Choose .eml file"}
          </label>
          <span className="email-import-help">Read on this device · 50 KB max</span>
        </div>
        {selectedFile && (
          <div className="email-file-chip" aria-live="polite">
            <FileIcon />
            <span><strong>{selectedFile.name}</strong><small>{formatEmlFileSize(selectedFile.size)} · {selectedFile.bodySource === "html" ? "HTML converted to plain text" : "Plain text extracted"}</small></span>
            <button type="button" onClick={removeSelectedFile} disabled={isLoading}>Remove</button>
          </div>
        )}
        {selectedFile && (
          <div className="email-parse-summary" aria-label="Imported email details">
            <dl>
              {selectedFile.metadata.from && <div><dt>From</dt><dd>{selectedFile.metadata.from}</dd></div>}
              {selectedFile.metadata.replyTo && <div><dt>Reply-To</dt><dd>{selectedFile.metadata.replyTo}</dd></div>}
              {selectedFile.metadata.to && <div><dt>To</dt><dd>{selectedFile.metadata.to}</dd></div>}
              {selectedFile.metadata.subject && <div><dt>Subject</dt><dd>{selectedFile.metadata.subject}</dd></div>}
              {selectedFile.metadata.date && <div><dt>Date</dt><dd>{selectedFile.metadata.date}</dd></div>}
            </dl>
            {selectedFile.attachments.length > 0 && (
              <div className="email-attachment-notice" role="note">
                <strong>{selectedFile.attachments.length} attachment{selectedFile.attachments.length === 1 ? "" : "s"} detected · Contents not scanned</strong>
                <ul>
                  {selectedFile.attachments.slice(0, 5).map((attachment, index) => {
                    const assessment = assessAttachment(attachment);
                    return <li key={`${attachment.filename}-${index}`}><span>{attachment.filename}</span><small data-tone={assessment.severity}>{assessment.label}</small></li>;
                  })}
                </ul>
                {selectedFile.attachments.length > 5 && <span>And {selectedFile.attachments.length - 5} more attachment{selectedFile.attachments.length - 5 === 1 ? "" : "s"}</span>}
              </div>
            )}
          </div>
        )}
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
            disabled={isLoading || isReadingFile}
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
        <button className="analyzer-submit" type="submit" disabled={isLoading || isReadingFile} aria-busy={isLoading || isReadingFile}>{isLoading ? (useAi ? "Analyzing with AI…" : "Analyzing locally…") : "Analyze email"} {isLoading ? <span className="button-spinner" aria-hidden="true" /> : <ArrowIcon />}</button>
      </form>
      <p className="preview-note" id="email-help"><LockIcon /> {useAi ? "AI-assisted analysis · Not stored by CyberFish" : "Imported files stay on this device until you choose Analyze"}</p>
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
