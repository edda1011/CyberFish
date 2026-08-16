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
