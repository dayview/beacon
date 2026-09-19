---
last_mapped_commit: 436a72b6ec40c88af8835c467bd006867be86e40
last_mapped_at: 2026-09-19
---
# Coding Conventions

**Analysis Date:** 2026-09-19

## Naming Patterns

**Files:**

- React/TypeScript components: PascalCase with `.tsx` extension (e.g., `HeatmapCanvas.tsx`, `Dashboard.tsx`)
- Utilities/libraries: camelCase with `.ts` extension (e.g., `api.ts`, `socket.ts`, `useModalA11y.ts`)
- Screens: PascalCase with `.tsx` extension in `src/screens/` (e.g., `LiveAnalytics.tsx`, `Participate.tsx`)
- Services (backend): camelCase with `.js` extension in `beacon-backend/src/services/` (e.g., `encryptionService.js`, `sectionInsightsService.js`)
- Routes (backend): camelCase with `.js` extension in `beacon-backend/src/routes/` (e.g., `auth.js`, `analytics.js`)
- Models (backend): PascalCase with `.js` extension in `beacon-backend/src/models/` (e.g., `User.js`, `Test.js`)
- Test files: kebab-case with `.test.js` suffix (e.g., `auth.test.js`, `encryption.test.js`)

**Functions:**

- Exported utility functions: camelCase (e.g., `getToken()`, `encrypt()`, `decrypt()`, `startTestServer()`)
- React hooks: camelCase with `use` prefix (e.g., `useAuth()`, `useTests()`, `useModalA11y()`)
- Private/internal functions: camelCase, no special prefix (e.g., `getKey()`, `round2()`, `average()`)
- Handler callbacks: camelCase with `handle` or `on` prefix (e.g., `handleSignOut()`, `handleOpenBoard()`, `handleStartTest()`)

**Variables:**

- Constants (module-level): UPPER_SNAKE_CASE (e.g., `TOKEN_KEY`, `IDLE_GAP_THRESHOLD_MS`, `API_BASE_URL`, `ENCRYPTION_KEY`)
- Object/variable names: camelCase (e.g., `currentScreen`, `isAuthenticated`, `accessToken`, `testId`)
- State variables: camelCase (e.g., `isModalOpen`, `activeBoardName`, `avgDwellMs`)
- DOM element refs: camelCase with `Ref` suffix (e.g., `canvasRef`, `containerRef`)

**Types:**

- Interfaces: PascalCase with `Props` or descriptor suffix (e.g., `HeatmapCanvasProps`, `ApiUser`, `ApiEvent`, `ApiSession`)
- Type aliases: PascalCase (e.g., `Screen`, `ApiSectionOutcome`)
- Mongoose schema/model definitions: PascalCase reference (e.g., `User`, `Test`, `Session`, `Board`)
- Enum-like constants: UPPER_SNAKE_CASE (e.g., `OUTCOMES.NORMAL`, `SECTION_OUTCOMES`)

## Code Style

**Formatting:**

- No ESLint or Prettier config in root — no auto-format enforced
- Indentation: 2 spaces (observed across all files)
- Line length: no hard limit enforced
- TypeScript strict mode enabled (`tsconfig.json`: `"strict": true`)
- JSX format: inline attributes, closing tag on same line or appropriate break

**Linting:**

- No linting config present in repo
- No `npm run lint` script
- TypeScript type checking via `npm run typecheck` (runs `tsc --noEmit`)
- `tsc` currently passes clean with strict mode enabled

**Frontend (React/TypeScript):**

- React 18.3.1 with functional components and hooks
- No class components observed
- Event handlers: use inline arrow functions or callback references (e.g., `onClick={() => handleOpenBoard(...)}` or `onClick={handleSignOut}`)
- Props destructuring in function signature (e.g., `const { data, width, height, ...props } = ...`)
- Type imports via `import type` only when needed (mostly full imports observed)

**Backend (Express/Node):**

- ESM imports/exports (all `.js` files use `import`/`export`)
- Error handling: try/catch with `console.error` logging and appropriate HTTP response codes
- Async/await pattern throughout; no raw Promises except in test setup helpers
- Middleware pattern: Express middleware as named functions or default exports

## Import Organization

**Order (Frontend):**

1. React and core dependencies (e.g., `import React, { useState, useEffect } from "react"`)
2. External packages (e.g., `import { Toaster, toast } from "sonner"`)
3. Relative imports for styles (e.g., `import "../styles/fonts.css"`)
4. Relative imports for components (e.g., `import { TestSetupModal } from "../components/TestSetupModal"`)
5. Relative imports for contexts (e.g., `import { TestProvider, useTests } from "../contexts/TestContext"`)
6. Lazy imports for screens (e.g., `const Dashboard = lazy(() => import("../screens/Dashboard").then((m) => ({ default: m.Dashboard })))`)

**Order (Backend):**

1. Node built-in modules (e.g., `import crypto from 'crypto'`, `import mongoose from 'mongoose'`)
2. External packages (e.g., `import { Router } from 'express'`)
3. Local models (e.g., `import User from '../models/User.js'`)
4. Local services (e.g., `import { encrypt, decrypt } from '../services/encryptionService.js'`)
5. Local middleware/routes/utilities (e.g., `import auth from '../middleware/auth.js'`)

**Path Aliases:**

- Frontend: `@` maps to `src/` (defined in `vite.config.ts` and `tsconfig.json`)
- Backend: No aliases; relative paths only

## Error Handling

**Frontend:**

- API errors: `ApiError` class with `status` and `data` properties (see `src/lib/api.ts`)
- 401 handling: dispatches `beacon:auth-expired` window event, which `AuthContext` listens for to silently re-provision a session
- User-facing errors: toast notifications via `sonner` (e.g., `toast.error('Failed to connect Miro...')`)
- No try/catch blocks in React components; errors in API calls propagate to callers or are caught in service functions

**Backend:**

- All route handlers wrapped in try/catch
- Errors logged with ISO timestamp: `console.error(\`[${new Date().toISOString()}] Error message:\`, error)`
- HTTP responses: consistent JSON error format `{ error: "User-facing message" }` or `{ error: "...", details: [...] }` for validation errors
- No error stack traces sent to client
- Auth failures: status 401 with message "Access denied" or "Invalid or expired access link"
- Validation errors: status 400 with error message or details array
- Server errors: status 500 with generic "Failed to..." message

## Logging

**Frontend:**

- Minimal logging; toasts are primary user feedback mechanism
- Console errors not typically used; API errors surface via toast
- No structured logging library

**Backend:**

- Console logging with ISO timestamp for errors: `console.error(\`[${new Date().toISOString()}] ...\`)`
- Logged at error points in route handlers (e.g., auth failures, service errors)
- No debug/info/warn levels enforced
- No structured logging library

## Comments

**When to Comment:**

- Complex algorithms or business logic (e.g., section insights classifier logic in `sectionInsightsService.js`)
- Non-obvious design decisions or constraints (e.g., "Miro Web SDK panel must render before auth checks")
- Important safety notes (e.g., test database URI intentionally uses different env var to prevent accidental production data touch)
- When the code's intent isn't immediately clear

**JSDoc/TSDoc:**

- Module-level JSDoc blocks document purpose and key context (e.g., `/**\n * Beacon API client...\n */`)
- Function JSDoc blocks (uncommon; only when behavior is non-obvious)
- Type/interface JSDoc comments used occasionally (e.g., for Mongoose schema fields)
- No strict JSDoc requirement; code is self-documenting when possible

**Inline Comments:**

- Used to mark logical sections with divider lines (e.g., `// ── Token management ────────────────────`)
- Single-line comments for clarification of non-obvious operations
- Comments rarely exceed 1–2 lines per block

## Function Design

**Size:** 

- Generally compact (under 50 lines for utility functions)
- Complex business logic (e.g., section insights) can extend to 150+ lines
- React components typically under 200 lines; larger screens broken into sub-components

**Parameters:** 

- Destructured where possible, especially for object parameters
- Type annotations required in TypeScript (frontend)
- Default parameters used for optional values (e.g., `radius = 40`, `opacity = 0.6`)
- No rest parameters (...args) unless variadic behavior needed

**Return Values:** 

- Async functions always return Promise<T>
- Void functions explicitly return nothing
- null/undefined used explicitly for absence of value (e.g., `override: null`, `expiresAt: null`)
- Errors thrown via Error subclasses (e.g., `throw new ApiError(...)`) rather than returned

**Side Effects:**

- Minimize side effects in utility functions
- React hooks manage side effects (useEffect)
- Event handlers with side effects clearly named (e.g., `handleOpenBoard`)

## Module Design

**Exports:**

- Named exports for functions/constants; default exports for components or main service functions
- Frontend components: default export (e.g., `export const Dashboard = (...) => {...}`)
- Backend services: named exports for functions (e.g., `export function encrypt(text)`)
- Models: default export for Mongoose model (e.g., `export default User`)

**Barrel Files:**

- No barrel files observed in `src/`; components/services imported individually
- Each module responsible for its own exports

**API Boundaries:**

- Frontend `src/lib/api.ts` centralizes all backend calls; components use `api.get/post/patch/delete` methods
- Socket.io client singleton in `src/lib/socket.ts`
- Backend routes delegate to services; services delegate to models
- Clear separation between HTTP handler (route), business logic (service), and data persistence (model)

## Data Types & Serialization

**API Types:**

- All types prefixed with `Api` when representing wire format (e.g., `ApiUser`, `ApiTest`, `ApiSession`)
- Interfaces defined in `src/lib/api.ts` for frontend, as JSDoc comments or TypeScript comments in backend
- Mongoose schemas define backend models; types inferred or documented in comments

**Null Handling:**

- Explicit null checks: `if (!value) return value` pattern used for optional fields
- `||` for default values (e.g., `fallbackFilename || 'default.csv'`)
- Optional chaining `.?` used in TypeScript (e.g., `this.miroTokens?.accessToken`)

## Special Patterns

**Frontend:**

- No login flow; anonymous access token session via `/api/auth/start` 
- Standalone routes (`/miro-panel`, `/participate`) skip `AuthProvider` (see `isStandaloneRoute` logic in `App.tsx`)
- Custom screen router using string state instead of react-router for main navigation
- Token stored in localStorage under key `beacon-token` (see `TOKEN_KEY` in `api.ts`)

**Backend:**

- No JWT or session tokens; access token is random 24-byte hex string (see `User.js`)
- Encryption for user-provided secrets (AI keys, Miro tokens) using AES-256-GCM
- Mongoose pre-hooks not observed; business logic in services and route handlers
- Admin scoping via explicit `researcher` field check in authorization middleware

---

*Convention analysis: 2026-09-19*
