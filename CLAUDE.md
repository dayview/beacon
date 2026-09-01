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
- Copy `beacon-backend/.env.example` to `.env` and fill in `MONGODB_URI`, `JWT_SECRET`, `ENCRYPTION_KEY` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), Miro OAuth creds, and `BEACON_OPENAI_KEY`. `PORT` defaults to `3001` — this must stay in sync with the frontend's Vite proxy target in `vite.config.ts` and with `VITE_API_URL` in the root `.env.example` if that's set.
- In production the backend serves the frontend's `dist/` as static files with an SPA fallback (`beacon-backend/src/server.js`) — there is no separate frontend host.

There are no automated test suites in either app currently.

## Architecture

### Frontend structure
- `src/app/App.tsx` — root component and hand-rolled screen router (a `currentScreen` string, not a routing library, despite `react-router` being a dependency). One exception: **`/miro-panel` renders `MiroPanel` before any auth check** — it's the panel Miro opens inside the board iframe, and must work even when the researcher isn't logged into the main app session.
- `src/app/components/ui/` — shadcn/Radix-based primitives (generated, don't hand-edit patterns here beyond what's needed).
- `src/components/` — Beacon-specific shared components (modals, heatmap canvas, etc.), plus a separate lightweight `src/components/ui/` (custom Button/Card/Badge/Input/Modal — distinct from `app/components/ui/`).
- `src/screens/` — top-level views wired up in `App.tsx` (`Dashboard`, `LiveAnalytics`, `Comparison`, `Boards`, `BoardCanvas`, `Settings`, `Participate`, `MiroPanel`, `Login`, `Templates`).
- `src/contexts/` — `AuthContext` (JWT session, auto-connects the socket on login/restore) and `TestContext` (test CRUD state).
- `src/lib/api.ts` — typed `fetch` wrapper (`api.get/post/patch/delete` + named methods), stores JWT in `localStorage` under `beacon-token`, dispatches a `beacon:auth-expired` window event on 401 that `AuthContext` listens for.
- `src/lib/socket.ts` — Socket.io client singleton; reads the JWT from `api.ts`'s token store for the handshake.
- `src/lib/useInteractionCapture.ts` — attaches click/mousemove/scroll listeners to a container, throttles + batches, and emits `session:event` over the socket. This is what drives heatmap data collection.
- Path alias `@` → `src/` (see `vite.config.ts`).

### Miro SDK integration
The app runs both as a standalone web app and embedded inside a Miro board. Miro-specific code (`MiroPanel.tsx`, `BoardCanvas.tsx`) talks to the global `miro` SDK object (`miro.board.ui`, `miro.board.getSelection()`, `miro.board.viewport`, etc.) — types come from `@mirohq/websdk-types`. Server-side OAuth/board sync lives in `beacon-backend/src/routes/miro.js` and `services/miroService.js`.

### Backend structure
Standard layered Express app: `routes/` (HTTP handlers) → `services/` (business logic) → `models/` (Mongoose schemas). Notable pieces:
- `middleware/auth.js` — JWT bearer auth, attaches `req.user`; `requireRole()` for role gating.
- `middleware/planLimits.js` — enforces free/pro/enterprise quotas (AI insights/month, sessions/test, recording) defined in `PLAN_LIMITS`.
- `services/encryptionService.js` — AES-256-CBC encrypt/decrypt for user-supplied AI provider API keys (requires `ENCRYPTION_KEY`); used because users bring their own key (`services/aiService.js` supports OpenAI, OpenRouter, Anthropic, etc. as swappable providers).
- `services/heatmapService.js`, `confusionService.js`, `flowService.js`, `comparisonService.js` — analytics computed from stored session events (dwell time, confusion zones, navigation flow, cross-test comparison).
- `socket/handlers.js` + `socket/events.js` — Socket.io wiring. JWT auth on handshake but **anonymous connections are allowed** (participants may not be logged-in users). Researchers join a `test:{id}` room (`researcher:join`) to watch live; participants stream events via `session:event`.
- CORS/CSP in `server.js` is intentionally scoped to allow embedding under `https://*.miro.com` (`frame-src`, `frame-ancestors`) — keep that in mind when touching security headers.

Full REST endpoint list and WebSocket event names are documented in `beacon-backend/README.md`.
