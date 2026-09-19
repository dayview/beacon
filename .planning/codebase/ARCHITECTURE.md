---
last_mapped_commit: 436a72b6ec40c88af8835c467bd006867be86e40
last_mapped_at: 2026-09-19
---
<!-- refreshed: 2026-09-19 -->

# Architecture

**Analysis Date:** 2026-09-19

## System Overview

Beacon is a two-tier, event-driven usability testing platform: an anonymous-session frontend (React + Vite) that embeds into Miro boards and communicates with an Express + MongoDB backend via REST API and WebSocket, computing real-time analytics from user interaction events.

```text
┌────────────────────────────────────────────────────────────────┐
│                     Frontend (React 18 + Vite)                  │
│  `src/app/App.tsx` → Screen Router (hand-rolled state machine) │
├─────────────────┬──────────────────┬──────────────────────────┤
│   AuthContext   │  TestContext     │  Screen Components       │
│ `src/contexts/` │ `src/contexts/`  │  `src/screens/`         │
│  (token mgmt)   │ (test CRUD)      │  (Dashboard, Analytics) │
└────────┬────────┴────────┬─────────┴──────────────┬───────────┘
         │                 │                        │
         ▼                 ▼                        ▼
┌────────────────────────────────────────────────────────────────┐
│                 Communication Layer                              │
│        `lib/api.ts` (fetch wrapper)                             │
│        `lib/socket.ts` (Socket.io client)                       │
└────────────────────────────────────────────────────────────────┘
         │                                          │
         ├─────────────────────────────────────────┤
         ▼                                          ▼
┌──────────────────────┐                ┌──────────────────────┐
│   REST API Routes    │                │   WebSocket Events   │
│  `:3001/api/*`       │                │   (real-time)        │
└──────────────────────┘                └──────────────────────┘
         │                                          │
         └──────────────────┬───────────────────────┘
                           ▼
        ┌─────────────────────────────────────────┐
        │  Backend (Express + Socket.io)          │
        │  `beacon-backend/src/server.js`         │
        ├──────────┬────────────┬──────────────────┤
        │ Routes   │ Socket     │ Middleware       │
        │ `routes/`│ Handlers   │ (auth, validate) │
        │          │ `socket/`  │                  │
        └──────────┴────────────┴──────────────────┘
                  │
                  ▼
        ┌─────────────────────────────────────────┐
        │ Services (Business Logic)               │
        │ `beacon-backend/src/services/`          │
        │ • aiService.js                          │
        │ • sectionInsightsService.js             │
        │ • confusionService.js                   │
        │ • flowService.js                        │
        │ • miroService.js                        │
        └─────────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────────────────────────┐
        │ Models (MongoDB via Mongoose)           │
        │ `beacon-backend/src/models/`            │
        │ • User.js                               │
        │ • Test.js                               │
        │ • Session.js                            │
        │ • Board.js                              │
        └─────────────────────────────────────────┘
                  │
                  ▼
        ┌─────────────────────────────────────────┐
        │      MongoDB (persistent store)         │
        └─────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **AuthContext** | Anonymous session provisioning, token lifecycle, silent re-auth on 401 | `src/contexts/AuthContext.tsx` |
| **TestContext** | Test CRUD (create, read, update, delete), test selection, cache management | `src/contexts/TestContext.tsx` |
| **App Router** | Hand-rolled screen state machine, route guards (standalone vs. owner routes) | `src/app/App.tsx` |
| **Screen Components** | Dashboard, LiveAnalytics, Comparison, Boards, Participate, SharedTestView, Settings, MiroPanel | `src/screens/` |
| **API Client** | Typed fetch wrapper, bearer-token auth, error handling, file downloads | `src/lib/api.ts` |
| **Socket Client** | Socket.io connection, event subscriptions, automatic reconnect | `src/lib/socket.ts` |
| **Express Routes** | HTTP endpoint handlers (auth, tests, sessions, analytics, miro, admin) | `beacon-backend/src/routes/` |
| **Socket Handlers** | WebSocket event routing, room management (test:{id}), participant/researcher join/leave | `beacon-backend/src/socket/handlers.js` |
| **Analytics Services** | Event aggregation, heatmap computation, confusion zone detection, navigation flow, section insights | `beacon-backend/src/services/` |
| **MongoDB Models** | User (anonymous owner), Test, Session, Board, Heatmap, AIInsight, Template | `beacon-backend/src/models/` |

## Pattern Overview

**Overall:** Layered event-driven architecture with separation of concerns (frontend UI, communication, backend business logic, persistence).

**Key Characteristics:**

- **No accounts:** Anonymous access via opaque token (random 48-hex string); token is both credential and bookmark
- **Token as credential:** Same `accessToken` is the bearer token for REST, the Socket.io handshake auth, and the shareable link (`/dashboard/:token`)
- **Real-time events:** Participants stream interaction events to server via `session:event`; researchers watch live via Socket.io room subscription (`test:{id}`)
- **Event-driven analytics:** Server stores raw events, computes insights (heatmaps, confusion zones, flow) on-demand via analytics routes
- **Lazy-loaded screens:** Each screen is a separate Vite chunk, loaded on first navigation to reduce initial bundle size
- **Miro-embedded:** App runs standalone or embedded in Miro boards; `MiroPanel.tsx` talks to global `miro` SDK; `/miro-panel` and `/participate` skip auth provisioning (standalone routes)

## Layers

**Presentation Layer (Frontend):**

- Purpose: User interfaces for researchers and participants
- Location: `src/screens/`, `src/components/`
- Contains: React components, screens, modals, charts (recharts), heatmap canvas
- Depends on: Contexts (AuthContext, TestContext), API client, Socket client
- Used by: End users (researchers, participants)

**State Management Layer (Frontend):**

- Purpose: Application state persistence and lifecycle
- Location: `src/contexts/`
- Contains: AuthContext (session/token), TestContext (test list/selection)
- Depends on: API client, Socket client
- Used by: Screen components

**Communication Layer (Frontend):**

- Purpose: Network abstraction and data transport
- Location: `src/lib/api.ts`, `src/lib/socket.ts`
- Contains: Typed fetch wrapper, Socket.io client, token storage
- Depends on: Vite config (VITE_API_URL), window/localStorage
- Used by: Contexts, screens

**HTTP Routes Layer (Backend):**

- Purpose: REST endpoint handlers, request validation
- Location: `beacon-backend/src/routes/`
- Contains: Route handlers for auth, tests, sessions, analytics, miro, admin
- Depends on: Services, models, middleware (auth, validation)
- Used by: Express app, frontend API calls

**WebSocket Layer (Backend):**

- Purpose: Real-time event streaming and room management
- Location: `beacon-backend/src/socket/`
- Contains: Socket.io event handlers, frame resolution logic, room subscriptions
- Depends on: Models, services (for storing events)
- Used by: Participants (event emit), researchers (event listen)

**Business Logic Layer (Backend):**

- Purpose: Analytics computation, Miro integration, AI analysis
- Location: `beacon-backend/src/services/`
- Contains: sectionInsightsService, confusionService, flowService, aiService, miroService, encryptionService
- Depends on: Models, external APIs (Miro SDK, OpenAI/OpenRouter)
- Used by: Routes, socket handlers

**Data Layer (Backend):**

- Purpose: MongoDB persistence schema and queries
- Location: `beacon-backend/src/models/`
- Contains: Mongoose schemas for User, Test, Session, Board, etc.
- Depends on: Mongoose, MongoDB
- Used by: Services, routes

## Data Flow

### Primary Request Path (REST)

1. **Frontend initiates action** (`src/screens/`, `src/contexts/`)
   - Example: User clicks "View Analytics" on Dashboard
2. **API call via typed client** (`src/lib/api.ts`)
   - Example: `api.get('/api/analytics/:testId/elements')` with bearer token in Authorization header
3. **Backend route handler** (`beacon-backend/src/routes/analytics.js`)
   - Validates authorization: `auth` middleware looks up user by `accessToken`
   - Validates request: `authorizeTestOwner` ensures user owns the test
   - Parses filters: `?sessionId=`, `?role=`, `?sectionId=`
4. **Service computes result** (`beacon-backend/src/services/exportService.js`, etc.)
   - Queries sessions, events from MongoDB
   - Aggregates data (element stats, dwell time, etc.)
5. **Response returns to frontend** (`src/lib/api.ts`)
   - Handles 401 (dispatches `beacon:auth-expired` event for silent re-auth)
   - Returns typed data to caller
6. **Frontend updates state and renders** (`src/screens/LiveAnalytics.tsx`)
   - Charts, heatmap canvas, section cards rerender with new data

### Real-Time Event Path (WebSocket)

1. **Participant joins session** (`src/screens/Participate.tsx`)
   - Emits `session:join` via Socket.io with sessionId, participantInfo
2. **Server receives join** (`beacon-backend/src/socket/handlers.js`)
   - Creates/updates Session doc in MongoDB
   - Adds socket to `session:{id}` room
   - Broadcasts `participant:joined` to all sockets in `test:{testId}` room (so researchers see live counts)
3. **Participant streams task events** (`src/screens/Participate.tsx`)
   - Emits `session:event` for dwell, backtrack, confusion signals
4. **Server processes event** (`beacon-backend/src/socket/handlers.js`)
   - Stores event in Session.events array
   - Resolves frameId using `resolveFrameId` (matches event coordinates to synced Board.elements)
   - Broadcasts `participant:event` to researchers in `test:{testId}` room
5. **Researcher watches live** (`src/screens/LiveAnalytics.tsx`)
   - Joined `test:{testId}` room on mount (`src/lib/socket.ts`)
   - Receives `participant:event`, `participant:joined`, `participant:left` events
   - Updates live count, refreshes analytics cards, redraws heatmap
6. **Session ends** (participant completes or times out)
   - Participant emits `session:complete`
   - Server marks Session as complete, broadcasts `participant:left`
   - Server can trigger AI analysis if configured

### Analytics Computation Flow

1. **Events accumulated** in Session.events array as participants interact
2. **Frontend requests analytics** (e.g., `GET /api/analytics/:testId/confusion`)
3. **Service queries all sessions for test** (`beacon-backend/src/services/confusionService.js`)
   - Filters by `?sessionId=`, `?role=`, `?sectionId=` if provided
4. **Service aggregates dwell times, backtrack counts, etc.**
   - Per-element metrics: total interactions, dwell time, error/success rate
5. **Service detects patterns** (confusion zones, navigation paths, scroll depth)
6. **Frontend renders heatmap, charts, section cards** with computed data
7. **Owner can override AI assessment** via SectionOverrideControl (`src/components/SectionOverrideControl.tsx`)
   - Stores override in Test.sectionOverrides array
   - Next fetch of `/api/analytics/:testId/sections` respects override

**State Management:**

- **Frontend state:** Token in localStorage (`beacon-token`), test list in TestContext, UI state (currentScreen, modalOpen) in component state
- **Backend state:** User, Test, Session, Board docs in MongoDB; Socket.io rooms track active connections (ephemeral, not persisted)
- **Session lifecycle:** Draft → Active → Completed (stored in Test.status, Test.startedAt, Test.endedAt)

## Key Abstractions

**AccessToken (Frontend & Backend):**

- Purpose: Represents an anonymous owner's session
- Format: Random 48-character hex string (generated by `crypto.randomBytes(24).toString('hex')`)
- Used as: Bearer token in `Authorization: Bearer {token}` header, Socket.io handshake `auth.token`, shareable link `/dashboard/{token}`
- Storage: localStorage under key `beacon-token`
- Lifecycle: Created by `POST /api/auth/start`, persists until `logout()` clears localStorage

**Test (Backend Model, `beacon-backend/src/models/Test.js`):**

- Purpose: Represents a usability test run on a Miro board
- Key fields:
  - `researcher`: ObjectId pointing to User (the owner)
  - `board`: ObjectId pointing to Board (the Miro board)
  - `type`: "solo", "live-session", or "remote"
  - `status`: "draft", "active", "paused", "completed"
  - `tasks`: Array of task definitions (description, targetElement, successCriteria)
  - `sectionOverrides`: Owner's manual assessments of sections (frameId + outcome + note)
  - `shareToken`: Read-only credential for shared analytics link

**Session (Backend Model, `beacon-backend/src/models/Session.js`):**

- Purpose: One participant's interaction data within a test
- Key fields:
  - `test`: ObjectId pointing to Test
  - `participantId`: Optional participant name or ID
  - `events`: Array of interaction events (dwell, backtrack, task_complete, etc.)
  - `status`: "active", "completed", "abandoned"
  - `startedAt`, `endedAt`: Timestamps

**Board (Backend Model, `beacon-backend/src/models/Board.js`):**

- Purpose: Synced Miro board metadata
- Key fields:
  - `miroId`: Miro board ID (base64-like string)
  - `title`: Board name
  - `elements`: Array of Miro board elements (frames, shapes, text)
  - `lastSyncedAt`: Timestamp of last sync from Miro API

**Heatmap (Frontend & Backend):**

- Purpose: Visual overlay of interaction intensity (dwell, clicks, attention)
- Computed by: `beacon-backend/src/services/heatmapService.js`
- Rendered by: `src/components/HeatmapCanvas.tsx` (uses heatmap.js library)
- Data: Click coordinates, dwell zones, scroll depth heat distribution

**SectionInsight (Backend, `sectionInsightsService.js`):**

- Purpose: AI-computed assessment of a frame/section (e.g., "Confusion", "Success", "Abandoned")
- Fields:
  - `frameId`: Miro frame ID
  - `outcome`: One of SECTION_OUTCOMES (defined in `beacon-backend/src/constants/sectionOutcomes.js`)
  - `reasoning`: Human-readable explanation of classifier's decision
  - `signals`: Array of detected signals (backtrack, idle-time, zoom-repeat, etc.)
- Lifecycle: Generated on-demand by service, stored in database, can be overridden by owner

## Entry Points

**Frontend (Web App):**

- Location: `src/main.tsx` (entry point)
- Triggers: Browser navigation to `/`, `/dashboard/{token}`, `/participate`, `/shared`, `/miro-panel`
- Responsibilities:
  1. Mount React app to DOM
  2. Render App.tsx (AuthProvider → TestProvider → AppContent)
  3. AuthContext provisions session or restores from URL/localStorage
  4. Hand-rolled router in App.tsx dispatches to appropriate screen

**Frontend (Miro Panel):**

- Location: `src/screens/MiroPanel.tsx`
- Triggers: Miro SDK loads app as panel (onboarding or settings)
- Responsibilities:
  1. Register listeners on global `miro` SDK (selection, cursor, viewport)
  2. Stream Miro events to server via Socket.io
  3. Render Miro board configuration/controls

**Frontend (Public Participate Link):**

- Location: `src/screens/Participate.tsx`
- Triggers: Browser navigation to `/participate?test={testId}`
- Responsibilities:
  1. Load test definition (tasks, targetElements)
  2. Render step-by-step walkthrough (one task per screen)
  3. Capture dwell time, backtrack, completion signals
  4. Emit events to server via Socket.io

**Backend (HTTP Server):**

- Location: `beacon-backend/src/server.js`
- Triggers: `npm run dev` or `npm start`
- Responsibilities:
  1. Initialize Express app with middleware (cors, helmet, rate-limit)
  2. Initialize Socket.io server
  3. Connect to MongoDB
  4. Mount routes (auth, tests, sessions, analytics, miro, admin)
  5. Start HTTP+WebSocket server on port 3001 (default)

**Backend (Socket.io Server):**

- Location: `beacon-backend/src/socket/handlers.js`
- Triggers: Client Socket.io connection to `/socket.io`
- Responsibilities:
  1. Authenticate socket (bearer token in handshake)
  2. Listen for participant events (session:join, session:event, session:complete)
  3. Listen for researcher joins (researcher:join to subscribe to test:{id} room)
  4. Broadcast live updates to subscribed researchers
  5. Persist events to MongoDB

## Architectural Constraints

- **Embedded iframe:** Frontend runs inside Miro's iframe (cross-origin); `src/lib/socket.ts` handles token extraction from parent window if needed; Miro SDK methods are unavailable outside Miro context
- **Global state:** AuthContext manages token globally; TestContext manages test list globally; no Redux or state machine library (intentionally minimal)
- **No JWT or expiry:** Access token never expires; bearer token is random and opaque (no signature verification)
- **Anonymous only:** No traditional user accounts, no roles, no permission tiers (plan limits were removed)
- **Single-threaded frontend:** React is single-threaded; heavy analytics rendering (heatmap canvas) runs on main thread; no Web Workers
- **Mongoose eager loading:** Relations (Test.board, Session.test) are populated via `.populate()` in routes; no lazy-loading pattern
- **Socket.io rooms:** Researchers watch `test:{testId}` rooms; participants don't join test rooms (only their own `session:{sessionId}` room for task updates)
- **Circular imports:** None observed in current codebase; frontend path alias `@` prevents circular reference issues
- **CORS/CSP:** Backend intentionally allows Miro iframe via `frame-src` and `frame-ancestors` directives in helmet config

## Anti-Patterns

### Mixing Concerns in Route Handlers

**What happens:** Routes in `beacon-backend/src/routes/` sometimes contain business logic inline (e.g., analytics computation) rather than deferring to services.

**Why it's wrong:** Hard to test, verbose routes, logic can't be reused by WebSocket handlers, analytics queries live in multiple places.

**Do this instead:** Extract all query/aggregation logic to services (e.g., `beacon-backend/src/services/analyticsFilters.js`, `exportService.js`). Routes become thin: validate → call service → respond.

### Silent Failures in WebSocket Event Handlers

**What happens:** `socket/handlers.js` catches errors and logs them but doesn't notify the client, leaving researchers wondering why live counts stopped updating.

**Why it's wrong:** Participant think they're sending data, researcher thinks they're receiving it, but events silently drop on the floor.

**Do this instead:** Emit error events back to client (`socket.emit('error', { message, code })`); add circuit breaker for repeated failures; surface warnings in frontend UI.

### Overfetching in Analytics Routes

**What happens:** `GET /api/analytics/:testId/confusion` fetches all sessions, all events, computes everything, even if frontend only needs zone count.

**Why it's wrong:** Slow (O(n) for every request), scales poorly, doesn't cache.

**Do this instead:** Add optional `?compact=true` query param; return minimal payload (just zone count + frame IDs); cache aggregates at Test or Session level on write (increment counters as events arrive).

## Error Handling

**Strategy:** Defensive error logging with user-facing fallback messages; no error propagation across layers without context.

**Patterns:**

- **API errors** (`src/lib/api.ts`): Catch non-200 responses; parse error details; dispatch `beacon:auth-expired` for 401; throw `ApiError` with status and data
- **Auth failures** (`src/contexts/AuthContext.tsx`): Catch 401 from `/api/auth/me`, clear token, re-provision session silently
- **WebSocket errors** (`beacon-backend/src/socket/handlers.js`): Catch try-catch in event handlers; log with timestamp; allow socket to stay connected (don't close)
- **Analytics compute** (`beacon-backend/src/services/`): Validate inputs (sessionIds, dates), return empty result if no matching data (don't throw)
- **Database errors** (`beacon-backend/src/models/`): Mongoose throws on validation failure; routes catch and respond with 400 + error details

## Cross-Cutting Concerns

**Logging:** Console.log with ISO timestamps (e.g., `[2026-09-19T10:30:00.000Z] Socket connected: ...`); no centralized logger; backend logs to stdout (captured by container/platform)

**Validation:** Express-validator on routes (`beacon-backend/src/middleware/validation.js`); input sanitization via Mongoose schema types; client-side validation in React (react-hook-form in modals)

**Authentication:** Bearer token lookup against `User.accessToken` in `middleware/auth.js`; optional query param `?token=` for contexts that can't set headers (image src, state param); no refresh tokens or expiry

**Authorization:** `middleware/authorize.js` checks `req.user._id === test.researcher` (only owner can access test's own endpoints)

**Rate limiting:** Global 200 req/15min per IP on `/api/` routes (via express-rate-limit)

**Encryption:** User-supplied API keys (OpenAI, OpenRouter, Anthropic) encrypted at rest via `services/encryptionService.js` (AES-256-CBC)

**PII Redaction:** Participant demographics (name, email from Miro) redacted before storage via `services/piiRedaction.js`

---

*Architecture analysis: 2026-09-19*
