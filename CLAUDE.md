# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Beacon is a native usability-testing and analytics platform built as a **Miro app**. It overlays real-time heatmaps directly on Miro boards and surfaces AI-powered insights from user interaction data, without leaving Miro's workflow.

The repo contains two independent Node apps:
- **root** — Vite + React 18 + TypeScript frontend, embeds into Miro as an iframe app.
- **`beacon-backend/`** — Express + Socket.io + MongoDB (Mongoose) API server, its own `package.json`.

## Commands

### Running both apps together (run from repo root)
- `npm run dev:all` — starts frontend (`:5173`) and backend (`:3001`) together via `concurrently`, labeled/colored `[frontend]`/`[backend]`. Use this instead of opening two terminals — it also avoids ending up with orphaned/duplicate dev server processes on the same ports.
- Requires both `npm install` at the root **and** `npm install` in `beacon-backend/` first, plus a `beacon-backend/.env` (see below) — otherwise the backend half will just retry-loop on `MONGODB_URI environment variable is not set.`

### Frontend only (run from repo root)
- `npm install` — install deps
- `npm run dev` — start Vite dev server (`localhost:5173`), proxies `/api` and `/socket.io` to `localhost:3001`
- `npm run dev:backend` — shortcut for `npm run dev --prefix beacon-backend`, without `concurrently`
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build

There is no lint script or ESLint config in this repo, and no `tsconfig.json` — don't assume `npm run lint` or `tsc` work despite what the root README's table says.

### Backend only (run from `beacon-backend/`)
- `npm install` — install deps
- `npm run dev` — start with `node --watch` (auto-reload)
- `npm start` — production start
- `npm run build` — **not a backend build**; it `cd ..`s and runs the *root* frontend build. The backend has no compile step of its own (plain ESM JS).
- Copy `beacon-backend/.env.example` to `.env` and fill in `MONGODB_URI`, `ENCRYPTION_KEY` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), Miro OAuth creds, and `BEACON_OPENAI_KEY`. `PORT` defaults to `3001` — this must stay in sync with the frontend's Vite proxy target in `vite.config.ts` and with `VITE_API_URL` in the root `.env.example` if that's set. There is no `JWT_SECRET` — see Architecture below, auth isn't JWT-based.
- In production the backend serves the frontend's `dist/` as static files with an SPA fallback (`beacon-backend/src/server.js`) — there is no separate frontend host.

There are no automated test suites in either app currently.

## Architecture

### Frontend structure
- **No accounts, no login screen.** `AuthContext` silently provisions an anonymous owner (`POST /api/auth/start`, no email/password) the first time the app loads with no valid access token, then rewrites the URL to `/dashboard/:accessToken` — that private, unguessable link *is* the credential, bookmarkable/shareable in place of a login. There's no `Login` screen; `App.tsx` only ever shows a "couldn't reach Beacon, retry" state if the backend is unreachable while a session is being provisioned.
- `src/app/App.tsx` — root component and hand-rolled screen router (a `currentScreen` string, not a routing library, despite `react-router` being a dependency). One exception: **`/miro-panel` and `/participate` render before `AuthProvider` does anything** — `AuthContext` explicitly skips session provisioning on those paths (see `isStandaloneRoute`), since the Miro-embedded panel and the public participant link manage their own identity (or none at all) and don't need an owner session.
- `src/app/components/ui/` — shadcn/Radix-based primitives (generated, don't hand-edit patterns here beyond what's needed).
- `src/components/` — Beacon-specific shared components (modals, heatmap canvas, etc.), plus a separate lightweight `src/components/ui/` (custom Button/Card/Badge/Input/Modal — distinct from `app/components/ui/`).
- `src/screens/` — top-level views wired up in `App.tsx` (`Dashboard`, `LiveAnalytics`, `Comparison`, `Boards`, `BoardCanvas`, `Settings`, `Participate`, `MiroPanel`, `Templates`).
- `src/contexts/` — `AuthContext` (anonymous access-token session, described above) and `TestContext` (test CRUD state).
- `src/lib/api.ts` — typed `fetch` wrapper (`api.get/post/patch/delete` + named methods), stores the access token in `localStorage` under `beacon-token`, dispatches a `beacon:auth-expired` window event on 401 that `AuthContext` listens for (it silently re-provisions a fresh session rather than redirecting anywhere).
- `src/lib/socket.ts` — Socket.io client singleton; reads the access token from `api.ts`'s token store for the handshake.
- Interaction capture is split by surface, not a single shared hook: `MiroPanel.tsx` streams real Miro SDK selection/cursor events directly; `Participate.tsx` is a frame-per-step walkthrough (see `Test.tasks[].targetElement`) that emits per-step dwell/backtrack `task_complete` events rather than raw clicks, because Miro's live-embed iframe is cross-origin and can't be observed for real pointer events.
- Path alias `@` → `src/` (see `vite.config.ts`).

### Miro SDK integration
The app runs both as a standalone web app and embedded inside a Miro board. Miro-specific code (`MiroPanel.tsx`, `BoardCanvas.tsx`) talks to the global `miro` SDK object (`miro.board.ui`, `miro.board.getSelection()`, `miro.board.viewport`, etc.) — types come from `@mirohq/websdk-types`. Server-side OAuth/board sync lives in `beacon-backend/src/routes/miro.js` and `services/miroService.js`.

### Backend structure
Standard layered Express app: `routes/` (HTTP handlers) → `services/` (business logic) → `models/` (Mongoose schemas). Notable pieces:
- **`models/User.js` is an anonymous owner, not an account** — no email, no password. Its only credential is `accessToken` (random, generated on creation), which is also embedded directly in the frontend's `/dashboard/:accessToken` URL. There is no privileged role anymore (`requireRole`/`role` were removed with the login screen) and no plan-tier gating (`middleware/planLimits.js` was removed — everyone gets the same limits, i.e. none).
- `middleware/auth.js` — bearer-token auth: looks the token up directly against `User.accessToken` (no signing/verification step, no expiry) and attaches the doc to `req.user`. Also accepts `?token=` for contexts that can't set headers (an `<img src>`, an OAuth redirect's `state` param).
- `services/encryptionService.js` — AES-256-CBC encrypt/decrypt for user-supplied AI provider API keys (requires `ENCRYPTION_KEY`); used because users bring their own key (`services/aiService.js` supports OpenAI, OpenRouter, Anthropic, etc. as swappable providers, falling back to the pooled `BEACON_OPENAI_KEY` when a user hasn't set one).
- `services/heatmapService.js`, `confusionService.js`, `flowService.js`, `comparisonService.js` — analytics computed from stored session events (dwell time, confusion zones, navigation flow, cross-test comparison). `services/sectionInsightsService.js` adds per-frame ("section") reach/dwell/backtrack analysis with a confidence-scored, explained outcome — see its module docstring for the reasoning behind never asserting "confusion" from dwell time alone.
- `socket/handlers.js` + `socket/events.js` — Socket.io wiring. Handshake auth looks up the same `accessToken` scheme as REST, but **anonymous connections are allowed** (most participants have no owner session at all). Researchers join a `test:{id}` room (`researcher:join`) to watch live; participants stream events via `session:event`, which server-side resolves/attaches a `frameId` by joining against the synced `Board.elements` (see `resolveFrameId` in `handlers.js`).
- CORS/CSP in `server.js` is intentionally scoped to allow embedding under `https://*.miro.com` (`frame-src`, `frame-ancestors`) — keep that in mind when touching security headers.

Full REST endpoint list and WebSocket event names are documented in `beacon-backend/README.md` — note it likely still describes the old JWT/register/login flow and plan-tier limits; treat this file as the source of truth over that README until it's updated to match.
