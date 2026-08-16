"use client";

import { FormEvent, useState } from "react";

const MailIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg>;
const LockIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" /></svg>;
const ArrowIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;

export default function EmailAnalyzer() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!value.trim()) {
      setError("Paste the email text you want to check.");
      return;
    }

    setNotice("Email analysis will be available in Part 4B.");
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
              if (notice) setNotice("");
            }}
            aria-describedby={error ? "email-error" : "email-help"}
            aria-invalid={Boolean(error)}
          />
        </div>
        {error && <p className="form-error" id="email-error" role="alert">{error}</p>}
        <button className="analyzer-submit" type="submit">Analyze email <ArrowIcon /></button>
      </form>
      <p className="preview-note" id="email-help"><LockIcon /> Stays in your browser · Not stored or sent anywhere in Part 4A</p>
      {notice && <p className="email-notice" role="status">{notice}</p>}
    </div>
  );
}
