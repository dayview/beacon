---
last_mapped_commit: 436a72b6ec40c88af8835c467bd006867be86e40
last_mapped_at: 2026-09-19
---
# Codebase Structure

**Analysis Date:** 2026-09-19

## Directory Layout

```
beacon/ (monorepo with two independent apps)
├── src/                          # Frontend (Vite + React 18)
│   ├── main.tsx                  # Entry point, mounts React app
│   ├── app/
│   │   ├── App.tsx               # Root component, hand-rolled screen router
│   │   └── components/ui/        # shadcn/Radix-based UI primitives (generated)
│   ├── screens/                  # Top-level views (one per screen)
│   │   ├── Dashboard.tsx         # Home screen, test list
│   │   ├── LiveAnalytics.tsx     # Real-time analytics, heatmap, insights
│   │   ├── Comparison.tsx        # Cross-test session comparison
│   │   ├── Boards.tsx            # Miro board list, connect
│   │   ├── BoardCanvas.tsx       # Live board analytics overlay
│   │   ├── Participate.tsx       # Public participant walkthrough
│   │   ├── SharedTestView.tsx    # Read-only shared analytics link
│   │   ├── MiroPanel.tsx         # Miro panel integration (onboarding/settings)
│   │   ├── Settings.tsx          # User settings, AI provider config
│   │   └── Templates.tsx         # Test templates gallery
│   ├── contexts/                 # Application state (Context API)
│   │   ├── AuthContext.tsx       # Session/token lifecycle, anonymous user
│   │   └── TestContext.tsx       # Test CRUD, selection, caching
│   ├── components/               # Beacon-specific components (non-UI primitives)
│   │   ├── HeatmapCanvas.tsx     # heatmap.js visualization
│   │   ├── SectionOverrideControl.tsx  # Owner's manual assessment UI
│   │   ├── TestSetupModal.tsx    # New test creation form
│   │   ├── EditTestModal.tsx     # Edit test name/description
│   │   ├── DeleteConfirmModal.tsx # Destructive action confirmation
│   │   ├── UserProfileModal.tsx  # User settings modal
│   │   └── ui/                   # Lightweight custom primitives
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       ├── Input.tsx
│   │       └── Modal.tsx
│   ├── lib/                      # Utilities and clients
│   │   ├── api.ts                # Typed fetch wrapper, bearer-token auth
│   │   ├── socket.ts             # Socket.io client, event subscriptions
│   │   ├── useModalA11y.ts       # Accessibility hook for modals
│   │   └── utils.ts              # General utilities (cn, formatters, etc.)
│   ├── styles/
│   │   └── fonts.css             # Custom font declarations
│   └── vite-env.d.ts             # Vite client env types
│
├── beacon-backend/               # Backend (Express + Node.js)
│   ├── src/
│   │   ├── server.js             # Express app init, middleware, routes, Socket.io
│   │   ├── config/
│   │   │   └── database.js       # MongoDB connection via Mongoose
│   │   ├── middleware/
│   │   │   ├── auth.js           # Bearer token auth (User.accessToken lookup)
│   │   │   ├── authorize.js      # Test ownership check (req.user._id === test.researcher)
│   │   │   └── validation.js     # express-validator rules (testCreateValidation, etc.)
│   │   ├── routes/               # HTTP endpoint handlers
│   │   │   ├── auth.js           # POST /api/auth/start, GET /api/auth/me
│   │   │   ├── tests.js          # CRUD, start, sessions list
│   │   │   ├── sessions.js       # Session details, events, complete
│   │   │   ├── analytics.js      # Element stats, confusion, dwell, flow, sections, summary
│   │   │   ├── heatmaps.js       # Generate, list, fetch heatmaps
│   │   │   ├── ai.js             # AI session analysis, insights list
│   │   │   ├── miro.js           # OAuth connect, boards list, sync
│   │   │   ├── templates.js      # Test templates (gallery, CRUD)
│   │   │   ├── predictions.js    # AI confidence predictions
│   │   │   ├── users.js          # User profile endpoint
│   │   │   └── admin.js          # Admin utilities
│   │   ├── socket/               # WebSocket handlers
│   │   │   ├── handlers.js       # Event routing (session:join, session:event, researcher:join)
│   │   │   └── events.js         # Event name constants
│   │   ├── services/             # Business logic
│   │   │   ├── aiService.js      # LLM integration (OpenAI, OpenRouter, Anthropic)
│   │   │   ├── sectionInsightsService.js  # AI classification of frames (confusion, success)
│   │   │   ├── confusionService.js        # Dwell-time aggregation, confusion zones
│   │   │   ├── flowService.js             # Navigation path analysis, scroll depth
│   │   │   ├── comparisonService.js       # Cross-test session comparison
│   │   │   ├── heatmapService.js          # Heatmap data preparation
│   │   │   ├── miroService.js             # Miro OAuth, board fetch, board sync
│   │   │   ├── encryptionService.js       # AES-256-CBC for user API keys
│   │   │   ├── piiRedaction.js            # Redact name/email before storage
│   │   │   ├── analyticsFilters.js        # Build MongoDB query from filter params
│   │   │   └── exportService.js           # CSV/XLSX export, session stats
│   │   ├── models/               # Mongoose schemas
│   │   │   ├── User.js           # Anonymous owner (no email/password)
│   │   │   ├── Test.js           # Usability test (researcher, board, tasks, overrides)
│   │   │   ├── Session.js        # Participant interaction session (events array)
│   │   │   ├── Board.js          # Synced Miro board (miroId, elements, title)
│   │   │   ├── Heatmap.js        # Pre-computed heatmap data (type, intensity map)
│   │   │   ├── AIInsight.js      # AI-generated insights (frameId, outcome, reasoning)
│   │   │   └── Template.js       # Test templates (name, description, tasks)
│   │   ├── constants/
│   │   │   └── sectionOutcomes.js  # Enum of section assessment outcomes
│   │   └── seed-templates.js     # Populate templates collection
│   ├── .env.example              # Environment template (copy to .env)
│   ├── package.json              # Backend dependencies
│   └── README.md                 # Backend documentation
│
├── public/                       # Static assets (favicon, etc.)
├── dist/                         # Vite production build output (git-ignored)
├── index.html                    # Vite entry HTML (loads main.tsx via script)
├── vite.config.ts                # Vite config (React, Tailwind, API proxy, @ alias)
├── tsconfig.json                 # TypeScript strict mode (src/ only, not vite.config.ts)
├── tailwind.config.ts            # Tailwind CSS config
├── postcss.config.mjs            # PostCSS config (for Tailwind)
├── package.json                  # Frontend dependencies (React, Vite, Socket.io, etc.)
├── package-lock.json             # Frontend lockfile
├── CLAUDE.md                     # Project instructions (this file)
├── README.md                     # Project overview
├── .gitignore                    # Git exclusions (node_modules, dist, .env, etc.)
├── .env.example                  # Environment template
├── docker-compose.yml            # Docker Compose (frontend + backend + MongoDB)
├── Dockerfile                    # Production Dockerfile (multi-stage: build, run)
└── .planning/codebase/           # Codebase analysis docs (this project)
    ├── ARCHITECTURE.md
    └── STRUCTURE.md
```

## Directory Purposes

**`src/` (Frontend Root):**

- Purpose: React + TypeScript frontend application
- Contains: All frontend source code (React, contexts, screens, components, utilities)
- Key files: `main.tsx` (entry), `app/App.tsx` (root component)

**`src/screens/` (Top-Level Views):**

- Purpose: Each file is a full-screen view, lazy-loaded by router in `App.tsx`
- Contains: Dashboard, LiveAnalytics, Comparison, Boards, Participate, SharedTestView, Settings, MiroPanel, BoardCanvas, Templates
- Pattern: One default export per file; receives `onNavigate`, `onBack` callbacks for screen transitions; no nested routing within screens

**`src/contexts/` (Application State):**

- Purpose: Global state management via Context API
- Contains: AuthContext (token, user, isAuthenticated, logout), TestContext (tests list, selectTest, addTest)
- Usage: Wrapped around App tree; consumed by screens via `useAuth()`, `useTests()` hooks

**`src/components/` (Reusable Components):**

- Purpose: Beacon-specific, non-primitive UI components shared across screens
- Contains: Modals (TestSetupModal, EditTestModal, DeleteConfirmModal), HeatmapCanvas, SectionOverrideControl, UserProfileModal
- Distinction: `src/components/ui/` is lightweight custom primitives (Button, Card, Badge); `src/app/components/ui/` is shadcn/Radix generated (do not hand-edit)

**`src/lib/` (Utilities & Clients):**

- Purpose: Reusable utilities and API/WebSocket clients
- `api.ts`: Typed fetch wrapper with bearer-token auth, 401 handling, file downloads
- `socket.ts`: Socket.io client singleton, event subscriptions, room joins
- `useModalA11y.ts`: Hook for modal keyboard handling (Escape to close, focus trapping)
- `utils.ts`: Helper functions (cn for className merging, date formatting, etc.)

**`beacon-backend/src/routes/` (HTTP Endpoints):**

- Purpose: Express route handlers for REST endpoints
- Pattern: Each file is a Router; mount in `server.js` via `app.use('/api/path', router)`
- Responsibility: Validate input, check auth/authorization, call service, respond
- No business logic inline; defer to services

**`beacon-backend/src/services/` (Business Logic):**

- Purpose: Reusable business logic, data aggregation, external API integration
- Key files:
  - `sectionInsightsService.js`: AI-powered frame assessment (generates SECTION_OUTCOMES)
  - `confusionService.js`: Dwell-time analysis, confusion zone detection
  - `flowService.js`: Navigation path aggregation, scroll depth distribution
  - `aiService.js`: LLM provider abstraction (OpenAI, OpenRouter, Anthropic)
  - `miroService.js`: Miro OAuth, board fetching, element syncing
  - `encryptionService.js`: AES-256-CBC encryption for user API keys
- Called by: Routes, Socket.io handlers

**`beacon-backend/src/socket/` (WebSocket Handling):**

- Purpose: Real-time event streaming and room management
- `handlers.js`: Event listener setup (session:join, session:event, researcher:join, participant:left)
- `events.js`: Event name constants (SESSION_EVENT, PARTICIPANT_EVENT, TEST_UPDATED, etc.)
- No persistence logic here; delegates to services and models

**`beacon-backend/src/models/` (MongoDB Schemas):**

- Purpose: Mongoose schema definitions for persistence
- User: Anonymous owner (no email, just accessToken)
- Test: Usability test (researcher ID, board ID, tasks, sectionOverrides, shareToken)
- Session: Participant interaction data (events array, participantId, status timestamps)
- Board: Synced Miro board metadata (miroId, elements array, title)
- Heatmap, AIInsight, Template: Supporting models
- Indexes: On researcher, board, status for query performance

**`beacon-backend/src/middleware/` (Express Middleware):**

- `auth.js`: Bearer token validation; populates `req.user`
- `authorize.js`: Test ownership check; guards routes that require ownership
- `validation.js`: express-validator rules (testCreateValidation, etc.)

**`beacon-backend/src/config/` (Configuration):**

- `database.js`: MongoDB connection via Mongoose; runs on app startup

**`beacon-backend/src/constants/` (Enums & Constants):**

- `sectionOutcomes.js`: Enum of valid section assessment outcomes (used in Test.sectionOverrides, AIInsight.outcome)

## Key File Locations

**Entry Points:**

- Frontend: `src/main.tsx` (mounts React app)
- Frontend HTML: `index.html` (loads main.tsx via Vite script)
- Backend: `beacon-backend/src/server.js` (Express app initialization)

**Configuration:**

- Frontend Env: `.env.example` (copy to `.env`, set `VITE_API_URL`, `VITE_MIRO_CLIENT_ID`, etc.)
- Backend Env: `beacon-backend/.env.example` (copy to `.env`, set `MONGODB_URI`, `ENCRYPTION_KEY`, Miro creds, `BEACON_OPENAI_KEY`)
- Vite: `vite.config.ts` (API proxy, path alias @, Tailwind plugin)
- TypeScript: `tsconfig.json` (strict mode, scoped to src/)
- Tailwind: `tailwind.config.ts` (theme customization)

**Core Logic:**

- Frontend State: `src/contexts/AuthContext.tsx` (token provisioning), `src/contexts/TestContext.tsx` (test CRUD)
- Frontend Router: `src/app/App.tsx` (hand-rolled screen state machine)
- Backend Auth: `beacon-backend/src/middleware/auth.js` (bearer token lookup)
- Backend Analytics: `beacon-backend/src/routes/analytics.js` (all analytics endpoints), `beacon-backend/src/services/sectionInsightsService.js` (AI classification)
- Real-Time: `beacon-backend/src/socket/handlers.js` (event routing), `src/lib/socket.ts` (frontend subscription)

**Testing:**

- No automated test suites currently; `beacon-backend/src/seed-templates.js` is a data seed script

**Build & Deployment:**

- Vite build: `npm run build` (outputs to `dist/`)
- Vite preview: `npm run preview`
- Backend production: `npm start` in `beacon-backend/`
- Docker: `Dockerfile` (multi-stage build), `docker-compose.yml` (local dev with MongoDB)

## Naming Conventions

**Files:**

- React components: PascalCase (e.g., `Dashboard.tsx`, `HeatmapCanvas.tsx`)
- Utilities: camelCase (e.g., `api.ts`, `useModalA11y.ts`)
- Services: camelCase + `Service` suffix (e.g., `sectionInsightsService.js`, `miroService.js`)
- Models: PascalCase (e.g., `User.js`, `Test.js`)
- Routes: camelCase or plural (e.g., `analytics.js`, `tests.js`)

**Directories:**

- React components: plural (e.g., `screens/`, `components/`, `contexts/`)
- Backend layers: plural (e.g., `routes/`, `services/`, `models/`, `middleware/`)

**Functions & Variables:**

- Frontend: camelCase for functions (e.g., `handleNavigate`, `setCurrentScreen`), PascalCase for React components
- Backend: camelCase for functions (e.g., `resolveFrameId`, `computeElementStats`), async/await for promises

**Constants:**

- Enum keys: SCREAMING_SNAKE_CASE (e.g., `SECTION_OUTCOMES.SUCCESS`, `SESSION_EVENT`, `PARTICIPANT_JOINED`)
- Config values: camelCase (e.g., `pingTimeout`, `maxParticipants`)

**Types:**

- TypeScript interfaces: PascalCase + `Type` or `Props` suffix (e.g., `AuthContextType`, `LiveAnalyticsProps`)
- Mongoose schemas: PascalCase (e.g., `testSchema`, `taskSchema`)

## Where to Add New Code

**New Feature (End-to-End):**

1. **Backend Model**: Add schema to `beacon-backend/src/models/` if new entity type
2. **Backend Route**: Add endpoint to `beacon-backend/src/routes/` (e.g., new `features.js` router)
3. **Backend Service**: Add business logic to `beacon-backend/src/services/` if complex
4. **Frontend API**: Add typed method to `src/lib/api.ts` (e.g., `api.post('/api/features')`)
5. **Frontend Context**: Add state/actions to `src/contexts/` if shared across screens (otherwise local component state)
6. **Frontend Component**: Create in `src/components/` if reusable modal/card, else in relevant `src/screens/`
7. **Frontend Screen**: Add new screen to `src/screens/`, add route case to `App.tsx`
8. **Test Socket.io if needed**: Add event handler to `beacon-backend/src/socket/handlers.js`, event constant to `events.js`

**New Component/Module:**

- **Shared UI primitive** (used in 2+ places): `src/components/ui/` (lightweight) or `src/app/components/ui/` (shadcn)
- **Modal or complex component** (specific to one screen): Same directory as screen, import in that screen
- **Page/Screen**: `src/screens/` with default export, add to lazy imports in `App.tsx`
- **Context** (global state): `src/contexts/`, wrap in App, expose hook

**Utilities:**

- **API-related**: `src/lib/api.ts` (add method) or create typed interface in that file
- **Socket.io-related**: `src/lib/socket.ts` (add subscription function) or `beacon-backend/src/socket/handlers.js` (add handler)
- **General helpers**: `src/lib/utils.ts` or create domain-specific file (e.g., `src/lib/dateUtils.ts`)

## Special Directories

**`dist/` (Frontend Build Output):**

- Purpose: Vite production build (HTML, JS bundles, CSS, assets)
- Generated: By `npm run build`
- Committed: No (in `.gitignore`)
- Contents: Minified, chunked app.js, index.html with hash-named asset links

**`node_modules/` (Dependencies):**

- Purpose: Installed packages for frontend
- Generated: By `npm install`
- Committed: No (in `.gitignore`)
- Ignored by Git to reduce repo size

**`beacon-backend/node_modules/` (Backend Dependencies):**

- Purpose: Installed packages for backend
- Generated: By `npm install` in `beacon-backend/`
- Committed: No (in `.gitignore`)

**`public/` (Static Assets):**

- Purpose: Assets served as-is by Vite (favicon, robots.txt, etc.)
- Contents: favicon.ico (if present), other static files
- Copied to `dist/` on build

**`guidelines/` (Project Guidelines):**

- Purpose: Team documentation (coding standards, design system, etc.)
- Contents: Varies; may include design tokens, accessibility checklist

**`.planning/codebase/` (Codebase Analysis):**

- Purpose: Generated analysis documents (ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md)
- Generated: By `/gsd-map-codebase` skill
- Committed: Yes (part of repository for future reference)

---

*Structure analysis: 2026-09-19*
