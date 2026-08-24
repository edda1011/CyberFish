"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { validateQrImageFile } from "../../lib/qr-image";

const UploadIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" /></svg>;
const ImageIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8.5" cy="9" r="1.5" /><path d="m4 17 5-5 4 4 2-2 5 5" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  function revokePreviewUrl() {
    if (!previewUrlRef.current) return;
    URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }

  useEffect(() => () => revokePreviewUrl(), []);

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
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
    revokePreviewUrl();
    setSelectedImage(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePreviewError() {
    revokePreviewUrl();
    setSelectedImage(null);
    setError("CyberFish could not preview this image. Choose another PNG, JPG, or WebP file.");
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
            <img src={selectedImage.url} alt="Selected QR code preview" onError={handlePreviewError} />
          </div>
          <div className="qr-file-details">
            <ImageIcon />
            <span><strong>{selectedImage.name}</strong><small>{formatFileSize(selectedImage.size)} · Ready to scan locally</small></span>
            <button type="button" onClick={removeImage}>Remove</button>
          </div>
        </div>
      )}

      {error && <p className="form-error" id="qr-image-error" role="alert">{error}</p>}
      <p className="preview-note" id="qr-image-help"><LockIcon /> Read on this device · Image not uploaded or stored</p>
    </div>
  );
}
