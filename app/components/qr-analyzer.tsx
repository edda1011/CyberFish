"use client";

import { ChangeEvent, SyntheticEvent, useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "../../lib/analysis";
import { boundedQrImageDimensions, decodeQrCanvas, getQrHttpUrlDetails, validateQrImageFile } from "../../lib/qr-image";
import AnalysisResultView from "./analysis-result";

const UploadIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></svg>;
const ImageIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 5" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
const CopyIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></svg>;
const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;

type SelectedQrImage = {
  name: string;
  size: number;
  url: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function QrAnalyzer() {
  const [selectedImage, setSelectedImage] = useState<SelectedQrImage | null>(null);
  const [error, setError] = useState("");
  const [decodedContent, setDecodedContent] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [linkResult, setLinkResult] = useState<AnalysisResult | null>(null);
  const [linkError, setLinkError] = useState("");
  const [isAnalyzingLink, setIsAnalyzingLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const scanRunRef = useRef(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analysisControllerRef = useRef<AbortController | null>(null);

  const urlDetails = decodedContent ? getQrHttpUrlDetails(decodedContent) : null;

  function revokePreviewUrl() {
    if (!previewUrlRef.current) return;
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }

  useEffect(() => () => {
    scanRunRef.current += 1;
    revokePreviewUrl();
    analysisControllerRef.current?.abort();
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  function clearScanState() {
    scanRunRef.current += 1;
    setDecodedContent("");
    setIsDecoding(false);
    setCopyState("idle");
    setLinkResult(null);
    setLinkError("");
    setIsAnalyzingLink(false);
    analysisControllerRef.current?.abort();
    analysisControllerRef.current = null;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = null;
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    clearScanState();
    revokePreviewUrl();
    setSelectedImage(null);

    try {
      validateQrImageFile(file);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      setSelectedImage({ name: file.name, size: file.size, url });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CyberFish could not use this image. Choose another file.");
    } finally {
      event.target.value = "";
    }
  }

  function removeImage() {
    clearScanState();
    revokePreviewUrl();
    setSelectedImage(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePreviewError() {
    clearScanState();
    revokePreviewUrl();
    setSelectedImage(null);
    setError("CyberFish could not preview this image. Choose another PNG, JPG, or WebP file.");
  }

  async function decodeImage(event: SyntheticEvent<HTMLImageElement>) {
    const image = event.currentTarget;
    const scanRun = ++scanRunRef.current;
    setError("");
    setDecodedContent("");
    setCopyState("idle");
    setIsDecoding(true);

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (scanRun !== scanRunRef.current) return;

    try {
      const dimensions = boundedQrImageDimensions(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Canvas is unavailable");
      context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
      const content = decodeQrCanvas(canvas);
      if (scanRun !== scanRunRef.current) return;
      setDecodedContent(content);
    } catch (caught) {
      if (scanRun !== scanRunRef.current) return;
      setError(caught instanceof Error ? caught.message : "CyberFish could not read this QR code. Choose another image.");
    } finally {
      if (scanRun === scanRunRef.current) setIsDecoding(false);
    }
  }

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(decodedContent);
      setCopyState("copied");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyState("idle"), 2_000);
    } catch {
      setCopyState("error");
    }
  }

  async function analyzeDecodedLink() {
    if (!urlDetails || isAnalyzingLink) return;

    setLinkError("");
    setLinkResult(null);
    setIsAnalyzingLink(true);
    const controller = new AbortController();
    analysisControllerRef.current?.abort();
    analysisControllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch("/api/analyze/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlDetails.url }),
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message ?? "The link could not be analyzed. Try again.");
      if (analysisControllerRef.current === controller) setLinkResult(data as AnalysisResult);
    } catch (caught) {
      if (analysisControllerRef.current !== controller) return;
      const message = caught instanceof Error && caught.name === "AbortError"
        ? "The analysis took too long. Try again."
        : caught instanceof Error ? caught.message : "The link could not be analyzed. Try again.";
      setLinkError(message);
    } finally {
      clearTimeout(timeout);
      if (analysisControllerRef.current === controller) {
        analysisControllerRef.current = null;
        setIsAnalyzingLink(false);
      }
    }
  }

  return (
    <div className="qr-analyzer">
      <h2 className="analyzer-title" id="qr-analyzer-title">Scan a QR code safely</h2>
      <p className="analyzer-intro">Choose an image to inspect its QR code without opening the destination.</p>
      <input
        ref={fileInputRef}
        className="visually-hidden"
        id="qr-image-file"
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        aria-labelledby="qr-analyzer-title"
        aria-describedby={error ? "qr-image-error" : "qr-image-help"}
        aria-invalid={Boolean(error)}
        onChange={chooseImage}
      />

      {!selectedImage ? (
        <label className="qr-upload-zone" htmlFor="qr-image-file">
          <span className="qr-upload-icon"><UploadIcon /></span>
          <strong>Choose a QR image</strong>
          <small>PNG, JPG, JPEG, or WebP · 10 MB max</small>
        </label>
      ) : (
        <div className="qr-preview" aria-live="polite">
          <div className="qr-preview-image">
            <img src={selectedImage.url} alt="Selected QR code preview" onLoad={decodeImage} onError={handlePreviewError} />
            {isDecoding && <span className="qr-reading" role="status"><span className="button-spinner" aria-hidden="true" /> Reading QR code…</span>}
          </div>
          <div className="qr-file-details">
            <ImageIcon />
            <span><strong>{selectedImage.name}</strong><small>{formatFileSize(selectedImage.size)} · {isDecoding ? "Reading locally" : decodedContent ? "QR content found" : error ? "QR not found" : "Ready to scan locally"}</small></span>
            <span className="qr-file-actions"><label htmlFor="qr-image-file">Choose another</label><button type="button" onClick={removeImage}>Remove</button></span>
          </div>
        </div>
      )}

      {error && <p className="form-error" id="qr-image-error" role="alert">{error}</p>}
      {decodedContent && (
        <section className="qr-content" aria-labelledby="qr-content-title" aria-live="polite">
          <div className="qr-content-heading">
            <span><strong id="qr-content-title">Content found</strong><small>{urlDetails ? `Web address · ${urlDetails.hostname}` : "Text or other QR content"}</small></span>
            <button type="button" onClick={copyContent}><CopyIcon /> {copyState === "copied" ? "Copied" : "Copy content"}</button>
          </div>
          <code>{decodedContent}</code>
          {urlDetails && <p>This looks like a web address. CyberFish has not opened or analyzed it.</p>}
          {copyState === "error" && <p className="qr-copy-error" role="alert">Could not copy automatically. Select the content and copy it manually.</p>}
          {urlDetails && <button className="qr-analyze-action" type="button" onClick={analyzeDecodedLink} disabled={isAnalyzingLink} aria-busy={isAnalyzingLink}>{isAnalyzingLink ? "Analyzing link…" : "Analyze this link"} {isAnalyzingLink ? <span className="button-spinner" aria-hidden="true" /> : <ArrowIcon />}</button>}
          {urlDetails && <small className="qr-analysis-privacy">The decoded URL is sent for CyberFish link checks only after you choose this action.</small>}
          {linkError && <p className="qr-link-error" role="alert">{linkError}</p>}
        </section>
      )}
      <p className="preview-note" id="qr-image-help"><LockIcon /> Read on this device · Image not uploaded or stored</p>
      {linkResult && <AnalysisResultView result={linkResult} label={linkResult.hostname} ariaLabel="QR link analysis result" advisoryUrl={linkResult.threatIntelligence?.status === "match" ? linkResult.threatIntelligence.advisoryUrl : undefined} />}
    </div>
  );
}
