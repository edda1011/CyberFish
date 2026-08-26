# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

CyberFish is primarily for ordinary consumers who receive a suspicious link or email and want a clear second opinion before acting. Users should not need cybersecurity knowledge.

## Product Purpose

CyberFish helps people assess suspicious URLs, email content, and links encoded in QR images. It returns an understandable risk level, a 0–100 score, visible evidence, and practical next steps. Success means helping someone make a safer decision without presenting any result as an absolute guarantee.

## Positioning

Rules and threat intelligence establish the facts; AI may explain those facts in plain language but cannot override high-risk evidence or independently declare something safe.

## Operating Context

The first experience is a responsive website used on desktop or mobile when someone is unsure about a delivery message, bank email, account alert, or unfamiliar link.

## Capabilities and Constraints

- The MVP analyzes URLs, plain-text or imported email content, and QR code images selected by the user.
- URL analysis combines local rules with optional Google Safe Browsing reputation checks.
- Email text can be checked locally for common English scam patterns and suspicious link structure.
- Email analysis runs through a no-store server endpoint. Local analysis is the default; email content is sent to Google Gemini only after the user explicitly enables AI analysis.
- The email form can parse an `.eml` file locally, extract readable headers and text, and safely convert HTML-only bodies to plain text. Attachment names are shown but attachment scanning remains outside the current version.
- Imported `.eml` files receive conservative header analysis after the user starts an analysis. Explicit SPF, DKIM, or DMARC failures and sender-domain inconsistencies may raise risk; missing authentication data does not raise the score. Reported passes are evidence, not a guarantee.
- Attachment filenames and declared MIME types may produce conservative risk hints for executable, script, macro-enabled, disguised, or mismatched files. CyberFish does not open, upload, unpack, or scan attachment contents.
- Imported `.eml` files may be up to 15 MB and are parsed locally. Attachment sizes and unusually high attachment counts may add limited risk context, while readable email text remains capped before it reaches the analysis API.
- Email analysis results list detected web addresses as non-clickable text with their real hostname, local structural risk, and a copy control. CyberFish does not open the listed destinations.
- The service must not automatically open arbitrary user-provided websites or access private network addresses.
- Submitted URLs, email content, and results are not stored by default.
- The product must explain uncertainty and external-service failure instead of treating unknown results as safe.
- Accounts, saved history, attachment-content scanning, camera capture, clipboard image paste, and automatic page opening are outside the first version.

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

## QR Code Image Analysis

- The homepage analyzer adds a third `Scan a QR code` tab alongside URL and email analysis.
- Users can select one PNG, JPG/JPEG, or WebP image up to 10 MB. Camera capture and clipboard image paste are outside the initial QR image workflow.
- ZXing runs entirely in the browser to decode the selected image. The image, filename, preview, and decoded content are not sent to the server, stored, or logged.
- The interface shows a local preview, filename, file size, decoding state, decoded content, and a `Remove` control. Removing or replacing the image clears its preview, decoded content, errors, and any URL analysis result.

### Decoded content and URL analysis

- Decoded QR content is displayed as non-clickable text with a `Copy content` control.
- Only valid HTTP and HTTPS URLs receive a hostname label and an `Analyze this link` action.
- URL analysis begins only after the user selects `Analyze this link` and reuses the existing protected `/api/analyze/url` endpoint and result interface.
- CyberFish never opens the decoded destination automatically.
- Non-URL content, including Wi-Fi, contact, `javascript:`, `data:`, and `file:` payloads, remains visible and copyable but cannot be submitted to URL analysis.

### Safety and lifecycle

- The client validates both the declared image MIME type and file extension before decoding.
- Images over 10 MB are rejected. Oversized pixel dimensions are reduced locally before decoding to bound memory use.
- Decoded content has a fixed length limit. Empty or excessive payloads produce a clear error and are not analyzed.
- Preview object URLs are revoked when an image is removed, replaced, or the component unmounts.
- Errors distinguish unsupported files, excessive size, unreadable images, missing QR codes, empty QR content, and URL-analysis failures, and give the user a recovery step.

### Verification

- Test PNG, JPG/JPEG, and WebP images containing valid URLs, suspicious URLs, ordinary text, and no QR code.
- Test unsupported and disguised file types, files over 10 MB, excessive image dimensions, empty payloads, and excessive decoded content.
- Confirm that images are decoded locally and never included in API requests or privacy-safe logs.
- Confirm that URL analysis is not requested before explicit user action and that the existing URL endpoint and result UI are reused afterward.
- Confirm remove, replace, copy feedback, keyboard operation, focus states, mobile layout, and long-content wrapping.
- Confirm all existing URL, email, threat-intelligence, and API protection tests continue to pass.

## Vercel Public Demo Deployment

### Scope and deployment model

- Publishes CyberFish as a free, non-commercial public demo on the Vercel Hobby plan.
- Vercel imports the existing `edda1011/CyberFish` GitHub repository and treats `main` as the production branch.
- Every push to `main` triggers a new production build and deployment. The application remains a single Next.js project with its existing URL and email API routes.
- The first release uses the generated `*.vercel.app` address. A custom domain, paid hosting, analytics, accounts, and persistent storage are outside the initial deployment scope.

### Production configuration

- `GOOGLE_SAFE_BROWSING_API_KEY` and `GEMINI_API_KEY` are added to the Vercel Production environment as separate sensitive variables.
- `GEMINI_MODEL` is added as a non-secret Production variable.
- API keys remain server-side and must never be committed, exposed through `NEXT_PUBLIC_` variables, returned in API responses, or included in logs.
- `.env.local` remains local and ignored by Git. `.env.example` documents variable names without containing values.
- Environment-variable changes require a new deployment before they affect the production site.

### Runtime safety and failure behavior

- Existing request-size limits, no-store responses, outbound timeouts, SSRF protections, privacy-safe logs, and API rate limits remain enabled.
- External provider failure, timeout, invalid output, or quota exhaustion returns an understandable incomplete-analysis state and never converts an unknown result into a safe result.
- Gemini remains off by default and receives email text only after explicit user opt-in.
- QR images continue to be decoded locally in the browser and are never uploaded to Vercel.
- The current in-memory rate limiter is acceptable as baseline protection for a small demo, but it is not a strict global limit across multiple serverless instances. A shared rate-limit store is required before sustained or higher-risk public traffic.
- Vercel Analytics is not enabled for the initial deployment, avoiding additional tracking and scope.

### Delivery sequence

1. Verify a clean Git state, ignored secret files, automated tests, and a production build.
2. Create a Vercel account with GitHub and import the CyberFish repository.
3. Configure the three production environment variables before the first public release.
4. Deploy and review the build and function logs without exposing submitted content or secrets.
5. Test the homepage, URL rules and reputation lookup, local and opted-in AI email analysis, QR decoding, invalid inputs, and mobile layout at the public address.
6. Add the verified public URL and deployment notes to the README for a user-reviewed commit.

### Acceptance criteria

- The production deployment builds successfully from `main` and receives a public `*.vercel.app` URL.
- Desktop and mobile visitors can use URL, email, and QR analysis without installing software.
- Google Safe Browsing and explicitly enabled Gemini analysis work with server-side production credentials.
- Provider failures remain understandable and conservative, and no result is presented as a guarantee of safety.
- API keys are absent from Git history, browser-delivered code, responses, and logs.
- Submitted URLs, email content, QR content, full IP addresses, anonymous IP hashes, provider payloads, and raw error content are not retained in application logs.
- README deployment documentation matches the verified production setup.
