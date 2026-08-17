# CyberFish Testing Design

## Purpose

Part 5C adds fast, repeatable automated tests for CyberFish's existing analysis and protection logic. The tests should detect regressions before a commit without visiting submitted URLs or consuming Google API quota.

## Scope

The first testing stage covers TypeScript logic and server API behavior. Browser interaction tests are intentionally postponed until the planned final UI refinement, so interface changes do not create unnecessary test maintenance.

## Test Runner

CyberFish will use Vitest because it supports TypeScript, fast local execution, clear failure messages, and isolated mocks for external providers.

The project will expose two commands:

- `npm test` runs the full test suite once.
- `npm run test:watch` reruns relevant tests while files change.

## Test Structure

Tests will live in a root-level `tests` directory:

```text
tests/
  analyze-url.test.ts
  analyze-email.test.ts
  email-ai.test.ts
  api-routes.test.ts
  rate-limit.test.ts
  security-log.test.ts
```

Each file has one responsibility so failures are easy to locate and future analyzers can add their own test files.

## Coverage

### URL analysis

- Normal HTTPS URLs
- HTTP URLs
- Direct IP-address links
- Punycode domains
- Known URL shorteners
- Excessive subdomains
- Empty, invalid, and oversized input

### Email analysis

- Normal notifications
- Urgent-pressure language
- Requests for passwords or verification codes
- Payment and gift-card scams
- Dangerous attachment or macro instructions
- Suspicious links embedded in email text
- Empty and oversized input

### Gemini assistance and result merging

- Successful structured response
- Missing API configuration
- Timeout
- Provider error
- Invalid JSON or invalid response structure
- Prompt-injection text remains untrusted input
- AI evidence cannot override local evidence
- AI scoring remains within CyberFish's fixed maximum contribution

All provider behavior will be simulated. Tests must not call the real Gemini API.

### API routes

- Invalid content type
- Invalid JSON
- Missing or incorrectly typed fields
- Oversized request body
- Optional AI flag defaults to off
- Provider failure returns a usable local result
- Responses remain non-cacheable

External threat-intelligence and AI calls will be replaced with controlled test doubles. API tests must not contact Google or visit submitted URLs.

### Rate limiting

- Requests consume the correct quota
- General analysis quota is enforced
- AI quota is enforced independently
- Rejected requests include a retry delay
- A new window resets the quota

### Security logs

- Each event is valid JSON
- Expected status and timing fields are present
- Sensitive test URL, email text, IP address, anonymous IP hash, API key, and raw error text are absent
- Completed, validation, rate-limit, and provider-unavailable events use the intended log level

## Isolation and Safety

Tests must be deterministic and work without `.env.local`. They must not depend on network access, real API keys, the current date, or an already-running development server. Mocks and fake clocks will be restored after every test so one test cannot affect another.

Production modules may expose small dependency-injection or reset helpers when necessary for safe testing. Such helpers must not weaken runtime validation or expose sensitive values.

## Acceptance Criteria

- `npm test` passes from a clean checkout after dependencies are installed.
- `npm run build` continues to pass.
- No test makes a real network request.
- No test consumes Google API quota.
- Test failures identify the failed behavior and show expected versus actual output.
- Existing website behavior and default-English interface remain unchanged.

## Deferred Work

Playwright browser tests, visual regression tests, coverage thresholds, and GitHub Actions are deferred until after the final UI refinement. They can be added without replacing the Vitest suite.
