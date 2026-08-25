# CyberFish Design Direction

## Purpose

This document defines the approved Part 9 UI and motion direction for CyberFish. It refines the existing ocean-intelligence identity without changing analysis logic, scores, APIs, privacy behavior, or product claims.

## Experience Direction

The approved direction is **Guided spotlight**: calm, readable, and gently dynamic. The analyzer and its result remain the main focus. Motion guides attention through the result instead of competing with it.

The homepage headline is:

> Pause. Check. Decide safely.

Supporting copy should remain short, direct, and understandable without cybersecurity knowledge.

## Visual Hierarchy

- Reduce the current left-side hero headline by approximately 25–30% so it supports rather than dominates the analyzer.
- Keep the analyzer as the primary visual focus on desktop and mobile.
- Use approximately 18–22px for result headings and 14–16px for result explanations and guidance.
- Display the numeric risk score at approximately 32–36px with a clear text risk label.
- Preserve generous spacing between the risk summary, evidence, and recommended actions.
- Long URLs, evidence, email details, and decoded QR content must wrap without causing horizontal overflow.

## Motion Language

Motion intensity is medium and purposeful:

- A slow spotlight may move subtly through the hero background.
- The risk summary may enter first, followed by evidence items in a short stagger and then recommended actions.
- Tabs, buttons, loading states, and result-state changes should transition smoothly.
- Results must become available immediately; animation must not delay access to content or interaction.
- Text must never continuously move, shake, or become harder to read.
- Prefer performant `transform` and `opacity` transitions. Use background effects only in small, controlled areas.
- `prefers-reduced-motion` must remove movement while preserving hierarchy, visibility, and state feedback.

## State and Interaction Rules

- Loading, low-risk, warning, dangerous, and error states share a consistent information structure.
- State must never be communicated by color alone.
- Error messages use readable text and explain the recovery action.
- URL, email, and QR inputs should not be unexpectedly cleared when users switch analyzer tabs.
- Existing privacy disclosures and explicit-consent boundaries remain visible and unchanged in meaning.
- Hover, focus, active, disabled, loading, success, and error states must remain distinguishable.
- Touch targets remain at least 44 by 44 pixels where practical, and keyboard focus stays visible.

## Responsive Behavior

- Desktop keeps the two-column hero, with a smaller headline and stronger analyzer emphasis.
- Mobile uses a single-column layout with the analyzer and results at full readable width.
- Mobile result content remains at the approved readable sizes rather than shrinking to fit.
- Decorative background motion is reduced on smaller screens.
- No supported viewport should introduce page-level horizontal scrolling.

## Implementation Stages

### Foundation and hero

- Establish shared typography and motion values.
- Add the guided spotlight background behavior.
- Replace and resize the hero headline.
- Add reduced-motion foundations.

### Analyzer controls

- Refine URL, email, and QR tab transitions.
- Improve input spacing and interactive state feedback.
- Preserve the current input behavior and safety boundaries.

### Analysis results

- Increase risk, evidence, explanation, and recommendation typography.
- Improve hierarchy and spacing.
- Add the approved staged result entrance without delaying content.

### Supporting page sections

- Bring the guidance, privacy, and footer sections into the guided spotlight visual language.
- Keep their factual copy and information architecture intact unless a clarity correction is separately approved.

### Final verification

- Verify desktop, intermediate, and mobile layouts.
- Verify keyboard navigation, visible focus, contrast, and reduced motion.
- Verify loading, success, warning, error, long-content, and missing-data states.
- Check browser console output and animation performance.
- Run the complete automated test suite and production build.
- Update project documentation.

Each implementation stage is reviewed by the user before the user creates its Git commit.

## Constraints

- Do not add a third-party animation library for Part 9.
- Do not modify analysis scoring, threat-intelligence logic, API contracts, logging, storage behavior, or privacy boundaries.
- Do not represent low risk as a guarantee of safety.
- Do not add fabricated claims, testimonials, certifications, or partner branding.
- Default website language remains English.
