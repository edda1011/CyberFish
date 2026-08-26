# CyberFish

CyberFish is a privacy-conscious phishing analyzer built with Next.js and TypeScript. It helps people inspect suspicious links, emails, and QR codes before deciding what to do next.

[Open the live CyberFish demo](https://cyber-fish-pi.vercel.app)

> CyberFish provides evidence and practical guidance, not a guarantee that content is safe.

## Features

- **Link analysis:** checks URL structure, HTTPS usage, public DNS destinations, domain registration age, embedded-domain impersonation patterns, and Google Safe Browsing reputation.
- **Email analysis:** reviews pasted text or imported `.eml` files for common phishing language, suspicious links, email authentication signals, and attachment metadata.
- **Optional AI assistance:** uses Google Gemini only when the user explicitly enables AI analysis. Local findings remain authoritative and available if Gemini cannot respond.
- **QR code analysis:** decodes PNG, JPG/JPEG, and WebP images locally in the browser without opening the destination automatically.
- **Clear results:** presents a risk level, a 0–100 score, visible evidence, and practical next steps in plain English.

## How analysis works

CyberFish validates the input first, applies local detection rules, and then uses the relevant external service when configured. Link destinations are not automatically opened. External-service failures are shown as unavailable or incomplete checks rather than being treated as proof of safety.

The internal API endpoints are:

- `POST /api/analyze/url`
- `POST /api/analyze/email`

Both endpoints return a consistent analysis result containing the risk level, score, evidence, and recommended actions.

## Privacy and safety

- CyberFish does not intentionally store submitted URLs, email content, imported `.eml` files, QR images, or analysis results.
- URL reputation checks send the submitted address to Google Safe Browsing.
- Email text is sent to Google Gemini only when `Use AI analysis` is enabled.
- QR images are decoded locally and are not uploaded by CyberFish.
- Security logs contain anonymous operational information and do not include submitted content, complete IP addresses, API keys, or raw provider errors.
- API keys remain in server-side environment variables and are never committed to the repository.

## QR code limitations

- Images must be PNG, JPG/JPEG, or WebP and no larger than 10 MB.
- Decoded content is displayed as non-clickable text and can be copied.
- HTTP and HTTPS destinations are analyzed only after the user selects `Analyze this link`.
- Camera capture and clipboard image paste are not currently supported.
- Successful decoding depends on image clarity and QR code quality.

## Local development

Requirements:

- Node.js
- npm

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3001` in your browser.

## Environment variables

Copy `.env.example` to `.env.local` and provide only the services you want to enable:

```env
GOOGLE_SAFE_BROWSING_API_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash
```

Never commit `.env.local` or paste API keys into issues, screenshots, or documentation.

## Testing

Run the automated test suite:

```bash
npm test
```

Run tests continuously while developing:

```bash
npm run test:watch
```

Create a production build:

```bash
npm run build
```

## Deployment

The public demo is deployed on Vercel from the `main` branch. After a commit is pushed to GitHub, Vercel builds the project and promotes a successful deployment to Production automatically.

Production secrets must be configured in Vercel Environment Variables rather than stored in GitHub.
