# CyberFish

CyberFish is a phishing URL and email analyzer built with Next.js and TypeScript.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3001` in your browser.

## Automated tests

```bash
npm test
```

Use `npm run test:watch` while developing to rerun tests when files change.

## Current progress

- Part 1: Project foundation
- Part 2: Responsive landing page UI
- Part 3A: Interactive local URL analysis rules
- Part 3B: Server-side URL analysis API
- Part 3C: Google Safe Browsing threat-intelligence adapter
- Part 4A: Email analyzer input UI
- Part 4B: Local English email analysis rules
- Part 4C: Protected server-side email analysis API
- Part 4D: Optional Gemini-assisted email analysis
- Part 5A: In-memory API rate limiting
- Part 5B: Privacy-safe structured security logs
- Part 5C1: Vitest foundation and local analysis tests
- Part 5C2: Offline Gemini and AI result-merging tests
- Part 5C3: API protection, rate-limit, and privacy-log tests
- Part 6A: RDAP domain registration age checks
- Part 6B: DNS and non-public network safety checks
- Part 6C: Embedded-domain impersonation detection
- Part 7A: Local `.eml` file import foundation
- Part 7B: Safe MIME parsing and readable `.eml` extraction
- Part 7C: Conservative `.eml` header and authentication analysis
