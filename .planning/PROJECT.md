# Beacon

## What This Is

Beacon is a native usability-testing and analytics platform built as a Miro app. It overlays real-time heatmaps directly on Miro boards and surfaces AI-powered, multi-signal (dwell, backtracking, idle time, reading order, zoom-repeat, click density) confidence-scored insights from participant interaction data, without leaving Miro's workflow. It's a mature, working product — not a fresh build.

## Core Value

Any researcher — including one without a technical background — can set up and run real usability testing on their own Miro boards, for free, without needing an engineering team or a commercial subscription. Accessibility and low setup cost take priority over matching commercial feature parity.

## Business Context

- **Customer**: UX researchers and teams running usability tests on Miro boards, especially ones without dedicated engineering support
- **Revenue model**: None — free and open-source by intent, not a monetization gap to close. This is a passion project, not a commercial venture
- **Success metric**: Real adoption by researchers who self-host or use it, and how little technical friction stands between "I want to test this Miro board" and actually running a session
- **Strategy notes**: None external — see Key Decisions below for the open-core precedent (PostHog, Plausible, Matomo) that grounds this positioning

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inferred from existing code + prior session history (see .planning/codebase/ and memory/bowei_mo_requirements.md). -->

- ✓ Anonymous, accountless owner sessions (access-token-as-credential, no login screen) — existing
- ✓ Miro Web SDK embed for live board tracking (`MiroPanel.tsx`) and board sync/comparison (`BoardCanvas.tsx`) — existing
- ✓ Multi-signal, confidence-scored per-section classifier — all six signals Bowei/Mo's product-defense audit named (dwell, backtracking, click density, idle time, reading order, zoom-repeat) — existing
- ✓ Owner validate/relabel review of classifier outcomes (`Test.sectionOverrides`) — existing
- ✓ Consolidated Findings + Heatmap dashboard in `LiveAnalytics.tsx` (collapsed from the original 5-tab layout) — existing
- ✓ Safeguards: participant consent notice, per-test data-retention warnings, PII redaction on demographics, revocable read-only share links — existing
- ✓ Docker Compose dev environment, GitHub Actions CI, backend test suite (`node:test`) — existing

### Active

<!-- Current scope for this milestone. Hypotheses until shipped and validated. -->

- [ ] A non-technical researcher/team can self-host Beacon end-to-end via a guided setup flow — today's manual steps (Miro OAuth app registration, hand-edited `.env`, `node -e crypto.randomBytes` for the encryption key, standing up MongoDB) get replaced or scripted, not just documented
- [ ] The repo is genuinely shareable as open-source: a real license is chosen and applied, and the README/docs are rewritten for someone trying to self-host, not just a contributor reading source
- [ ] Participants get the closest-to-automatic tracking activation Miro's platform actually allows when a board is shared — closing the last open item from the prior MVP audit (see Context)

### Out of Scope

- Platform-agnostic support (Figma, Adobe XD, generic websites) — explicitly decided to stay Miro-native; broadening the surface would dilute the "lives inside the artifact you already use" differentiator that makes it lower-friction than PostHog/Hotjar-style tools
- True zero-click, no-participant-action tracking activation — confirmed impossible on Miro's current developer platform (see Context); not a gap in Beacon, a platform ceiling
- Chasing commercial/enterprise feature parity (SSO, multi-researcher workspace RBAC, plan-tier gating) — already explicitly deferred in the prior requirements audit; stays deferred, consistent with the free/OSS positioning rather than an industry-standard-SaaS one

## Context

**Origin of current scope:** the classifier/safeguards work above was driven by a "Mirothon" product-defense session with evaluators Bowei and Mo (full history: prior session `d30a1c41`, summarized in memory `bowei_mo_requirements.md`). Their MVP audit found 4 gaps against the product pitch; 3 are now shipped (richer classifier signals, owner override, dashboard consolidation). The 4th — auto-activation on board share — is the one carried into this milestone.

**Platform constraint (verified against Miro's developer docs during this session):** there is no way to run a Miro Web SDK app, or capture live interaction telemetry (selection, cursor, zoom), without a participant explicitly launching it — either the app icon or, for "Instant Apps," a one-time "Run" click. The manifest has no auto-start/background-execution field. Webhooks are the only truly automatic mechanism, but they fire only on board *item* create/update/delete — never selection, hover, cursor, or zoom. So the product pitch's literal "sharing alone activates tracking" claim is not achievable as stated; the realistic target is one-click launch (Instant App) optionally paired with a coarser, fully-automatic webhook-based layer.

**Why the free/open-source reframe now:** not a response to any specific blocker, user complaint, or deadline — the owner described it as a passion project and a values-driven choice made mid-session, not a pivot forced by circumstance. Grounded in the open-core precedent set by PostHog ($1.4B valuation, $57.5M ARR as of Feb 2026, self-host-free-plus-paid-cloud model), Plausible, Umami, and Matomo — all real, working versions of "give the core away, don't chase feature-for-feature commercial parity."

**Known technical debt** (from `.planning/codebase/CONCERNS.md`, not yet triaged into requirements): no frontend test suite, a monolithic `LiveAnalytics.tsx`, silent frontend error handling, access tokens accepted via query parameter (documented/intentional pattern for `<img src>` and OAuth redirect contexts, not an oversight), and `retentionDays` that's surfaced as a warning but never enforced. Worth revisiting once OSS-readiness work exposes the codebase to outside eyes, but not pulled into Active scope by the owner in this session.

## Constraints

- **Tech stack**: Vite + React 18 + TypeScript frontend, Express + Socket.io + MongoDB (Mongoose) backend — existing, mature, no rewrite planned. See `.planning/codebase/STACK.md`.
- **Platform**: Miro Web SDK apps cannot auto-start or run in the background — confirmed via Miro developer docs this session. Shapes what "auto-activation" can mean; see Context.
- **Monetization**: none — free and open-source by explicit choice, not a gap. Setup/UX decisions should optimize for a self-hoster with no budget, not a paying enterprise buyer.
- **Audience skill floor**: self-hosting/deployment can assume basic comfort following a written guide, but not real engineering skill; day-to-day researcher usage (creating/running a test) must stay at the zero-technical-friction bar it's already at.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stay Miro-native rather than expand to other design/prototyping platforms | Deep Miro-board integration (no separate instrumentation needed) is the actual differentiator; broadening scope dilutes it | — Pending |
| Position as free/open-source rather than an industry-standard commercial product | Passion project with no monetization goal; open-core precedent (PostHog, Plausible, Matomo) validates this as a real strategy, not a naive one | — Pending |
| Target "closest Miro allows" for auto-activation (one-click Instant App + optional webhook coarse layer), not literal zero-click | Miro's platform has no background-execution mechanism for Web SDK apps — a confirmed hard ceiling, not an implementation gap | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-19 after initialization*
