# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CyberFish is primarily for ordinary consumers who receive a suspicious link or email and want a clear second opinion before acting. Users should not need cybersecurity knowledge.

## Product Purpose

CyberFish helps people assess suspicious URLs and email text. It returns an understandable risk level, a 0–100 score, visible evidence, and practical next steps. Success means helping someone make a safer decision without presenting any result as an absolute guarantee.

## Positioning

Rules and threat intelligence establish the facts; AI may explain those facts in plain language but cannot override high-risk evidence or independently declare something safe.

## Operating Context

The first experience is a responsive website used on desktop or mobile when someone is unsure about a delivery message, bank email, account alert, or unfamiliar link.

## Capabilities and Constraints

- The MVP will analyze URLs and plain-text email content.
- URL analysis combines local rules with optional Google Safe Browsing reputation checks.
- Email text can be checked locally for common English scam patterns and suspicious link structure.
- Email analysis runs through a no-store server endpoint. Local analysis is the default; email content is sent to Google Gemini only after the user explicitly enables AI analysis.
- The email form can parse an `.eml` file locally, extract readable headers and text, and safely convert HTML-only bodies to plain text. Attachment names are shown but attachment scanning remains outside the current version.
- Imported `.eml` files receive conservative header analysis after the user starts an analysis. Explicit SPF, DKIM, or DMARC failures and sender-domain inconsistencies may raise risk; missing authentication data does not raise the score. Reported passes are evidence, not a guarantee.
- Attachment filenames and declared MIME types may produce conservative risk hints for executable, script, macro-enabled, disguised, or mismatched files. CyberFish does not open, upload, unpack, or scan attachment contents.
- Imported `.eml` files may be up to 15 MB and are parsed locally. Attachment sizes and unusually high attachment counts may add limited risk context, while readable email text remains capped before it reaches the analysis API.
- The service must not automatically open arbitrary user-provided websites or access private network addresses.
- Submitted URLs, email content, and results are not stored by default.
- The product must explain uncertainty and external-service failure instead of treating unknown results as safe.
- Accounts, saved history, attachment uploads, and automatic page opening are outside the first version.

## Brand Commitments

- Product name: CyberFish.
- Website language defaults to English, with future localization left open.
- Voice is calm, direct, supportive, and understandable to non-technical users.
- The approved visual direction combines an immersive ocean-intelligence atmosphere with the warmth of a personal safety companion.

## Evidence on Hand

Google Safe Browsing v5 is the first optional threat-intelligence provider and requires a server-side API key. No testimonials, customer logos, certifications, or partner claims are available. Future interfaces must not fabricate them.

## Product Principles

- Show the evidence behind every conclusion.
- Give a practical next action, not only a score.
- Protect privacy by default.
- Never describe low risk as a guarantee of safety.
- Remain useful when an external service is unavailable.

## Accessibility & Inclusion

The responsive interface should use plain language, visible keyboard focus, sufficient contrast, reduced-motion support, and touch targets suitable for mobile use.

## Optional Gemini Email Analysis

### Scope and user consent

- Local email rules remain the default and always run first.
- The email form includes a `Use AI analysis` control that is off by default.
- The interface explains that enabling the control sends the submitted email text to Google Gemini for processing. CyberFish does not store the submitted content or analysis result.
- When the control is off, CyberFish must not send email content to Gemini or any other AI provider.

### Architecture and data flow

1. The client submits the email content and an explicit AI opt-in flag to the existing no-store email analysis endpoint.
2. The endpoint validates the request and performs the existing local analysis.
3. A separate Gemini adapter runs only when the user opted in and a server-side `GEMINI_API_KEY` is configured.
4. Gemini returns structured semantic findings for impersonation, social engineering, urgency, credential requests, payment requests, and other phishing tactics.
5. A merge layer validates and combines those findings with the local result.
6. The client labels evidence by source so users can distinguish local evidence from AI-assisted evidence.

The Gemini model name is server-configurable so a model can be changed without altering the analyzer or client. The API key and model configuration remain server-side and must never be returned to the browser or committed to Git.

### Scoring and authority

- Gemini may add a limited amount of risk when it identifies supported semantic evidence.
- Gemini cannot reduce the local score, remove local evidence, override a high-risk finding, or independently declare an email safe.
- AI output is treated as untrusted input: it must match the expected structure, use allowed categories, and stay within server-enforced score and evidence limits.
- The final result continues to include a risk level, 0-100 score, visible evidence, practical actions, and uncertainty language.

### Failure and privacy behavior

- Missing configuration, timeout, quota exhaustion, network failure, safety refusal, malformed output, or invalid structured data must fall back to the complete local result.
- When AI was requested but unavailable, the response and interface state this clearly without describing the result as safe.
- Requests use short timeouts and no-store responses. Logs contain anonymous operational errors only and never include submitted email text, prompts, model output, or detected links.
- Gemini integration uses a dedicated Google AI Studio key stored as `GEMINI_API_KEY`; it does not reuse the Google Safe Browsing key.

### Verification

- Confirm that AI-off requests never call the Gemini adapter.
- Confirm successful structured AI findings are validated, labeled, capped, and merged without lowering local risk.
- Confirm missing keys, timeouts, provider errors, malformed JSON, and unexpected categories return the local result with an AI-unavailable state.
- Confirm local high-risk evidence cannot be weakened by Gemini output.
- Confirm request limits, no-store headers, privacy copy, keyboard interaction, loading state, and mobile layout continue to work.
