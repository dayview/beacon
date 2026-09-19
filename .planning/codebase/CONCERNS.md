---
last_mapped_commit: 436a72b6ec40c88af8835c467bd006867be86e40
last_mapped_at: 2026-09-19
---
# Codebase Concerns

**Analysis Date:** 2026-09-19

## Tech Debt

### Frontend Component Size and Monolithic Design

- **Issue:** Several frontend components exceed 500+ lines and bundle multiple concerns (state, logic, rendering):
  - `src/screens/LiveAnalytics.tsx`: 1571 lines — heatmap rendering, metrics display, live participant tracking, analytics filters all in one file
  - `src/app/components/ui/sidebar.tsx`: 726 lines — navigation and sidebar logic tightly coupled
  - `src/screens/Comparison.tsx`: 448 lines — test selection, metric fetching, comparison display logic mixed
- **Files:** `src/screens/LiveAnalytics.tsx`, `src/app/components/ui/sidebar.tsx`, `src/screens/Comparison.tsx`, `src/screens/Dashboard.tsx` (343 lines)
- **Impact:** Difficult to test, reuse, or modify individual behaviors; high cognitive load for contributors; harder to track performance issues in large rendering trees
- **Fix approach:** Break into smaller, single-responsibility modules; extract metrics computation, filtering logic, and rendering into separate hook/component layers; consider using composition patterns to share behavior across screens

### Missing Frontend Test Suite

- **Issue:** Zero test coverage for frontend code despite backend having 952 lines of tests across 11 test files. Critical features untested:
  - `src/contexts/AuthContext.tsx` — anonymous session provisioning, token refresh, auth expiration handling
  - `src/contexts/TestContext.tsx` — test CRUD, state management, API error recovery
  - `src/lib/api.ts` — token lifecycle, 401 error handling, auth event dispatch
  - `src/lib/socket.ts` — Socket.io connection/reconnection, event registration
  - Major screens: LiveAnalytics, Comparison, Dashboard, Boards
- **Files:** All `src/` files; no `*.test.ts` or `*.spec.ts` files found
- **Impact:** Regressions go undetected; contributor confidence is low; refactoring is risky; auth/session bugs may reach production
- **Fix approach:** Add Jest or Vitest config; write unit tests for contexts and API client (highest priority); add integration tests for major screen flows; aim for 70%+ coverage of critical paths

### Silent Error Handling in Frontend

- **Issue:** Many error paths catch and silently ignore exceptions without logging, reporting, or user feedback:
  - `src/contexts/AuthContext.tsx` lines 81-84, 88-90, 106, 118: Errors in session resolution, refresh, and logout are caught but only logged minimally or ignored
  - `src/contexts/TestContext.tsx` lines 146-148: Non-fatal failures in batch session count enrichment silently degrade UX without any notification
  - `src/lib/api.ts` lines 47, 83: `response.json()` failures fall back to empty object without indicating parse failure
- **Files:** `src/contexts/AuthContext.tsx`, `src/contexts/TestContext.tsx`, `src/lib/api.ts`
- **Impact:** Silent failures lead to confusing UX where data doesn't load but no error message appears; harder to diagnose issues in production; user trust erodes
- **Fix approach:** Log all caught errors; dispatch error events or toast notifications for user-visible failures; distinguish between recoverable and fatal errors; add structured logging with context

### Weak Type Safety in Frontend

- **Issue:** Use of `any` type in critical data handling:
  - `src/contexts/TestContext.tsx` lines 85-89: Type casting Board model fields to `any` for safe navigation (`(t.board as any).elements`)
  - `src/lib/api.ts` line 60: Error detail mapping uses `(d: any) => d.message` without validation
- **Files:** `src/contexts/TestContext.tsx`, `src/lib/api.ts`
- **Impact:** Loss of compile-time safety; potential runtime errors if API response shape changes; harder to catch bugs during review
- **Fix approach:** Define strict types for API responses (Board model); add type guards for optional fields; use type narrowing instead of `as any` casts

## Security Considerations

### Authentication Token Exposed in Query Parameters

- **Risk:** Both frontend and backend accept bearer tokens via query string, exposing them in:
  - Server logs (Render, nginx, CloudFlare logs, etc.)
  - Browser history and autocomplete
  - Referrer headers sent to third-party sites
  - Cached URLs in browser/proxy caches
- **Files:** `src/lib/api.ts` line 143 (fetchSharedStats passes `?token=`); `beacon-backend/src/middleware/auth.js` lines 15-16 (accepts `req.query.token`)
- **Current mitigation:** Token is per-user, randomly generated, and unguessable; no password stored; acceptable for one-time shares but not recommended for production owner tokens
- **Recommendations:** 
  - For shared analytics links, use a separate short-lived `shareToken` field in the Token payload rather than the owner's access token
  - For owner auth, require Authorization header only; remove query param fallback from auth middleware
  - Document the token-in-URL dashboard link as a bookmarkable but not-for-sharing credential; consider expiry

### CORS Default Configuration Issue

- **Risk:** `beacon-backend/src/server.js` lines 33-36: CORS origin defaults to `http://localhost:5173` if `FRONTEND_URL` env var is not set
  - In production, if env var is misconfigured or missing, CORS silently falls back to localhost
  - Could allow unintended origins if the app is deployed under a different URL
- **Files:** `beacon-backend/src/server.js`
- **Current mitigation:** Explicit CORS rules for Miro (`https://*.miro.com`)
- **Recommendations:** 
  - Make `FRONTEND_URL` required (throw error if missing in production)
  - Add strict validation that the configured origin matches deployment domain
  - Log a warning at startup if CORS origin is set to localhost in non-development environments

### Helmet and CSP Configuration

- **Issue:** While Helmet is configured, CSP `frame-src` and `frame-ancestors` are explicitly opened to `https://*.miro.com` (necessary for Miro embedding) but could allow clickjacking from Miro-like domains
- **Files:** `beacon-backend/src/server.js` lines 37-47
- **Current mitigation:** Explicit allowlist restricts embedding to Miro; tighter than `*`
- **Recommendations:** Monitor for any CSP violations in production; consider adding `report-uri` directive for CSP violation reporting; review Miro domain allowlist periodically

## Performance Bottlenecks

### Large Embedded Arrays in MongoDB Session Documents

- **Issue:** Session model stores all events in an embedded array (`events: [eventSchema]`). As a test runs with 100+ participants for hours, a single Session document can grow to hundreds of MB:
  - No pagination or lazy-loading of events
  - Entire document fetched even when only metadata is needed
  - Analytics queries scan all events in memory
- **Files:** `beacon-backend/src/models/Session.js` lines 22-72
- **Impact:** Query performance degrades; memory usage spikes; GridFS or separate Events collection would be more scalable
- **Fix approach:** Move events to a separate `Event` collection with a Session reference; add TTL index for event expiry if events have short retention; implement pagination in frontend for event replays

### Unindexed Queries on Test Analytics

- **Issue:** Analytics endpoints compute aggregations across potentially large Session collections without clear index coverage:
  - `src/screens/LiveAnalytics.tsx` fetches heatmaps, confusion zones, dwell times, section insights for a single test
  - Multiple separate API calls trigger separate MongoDB aggregations
  - No query result caching on server (each fetch re-computes)
- **Files:** `beacon-backend/src/routes/analytics.js`, `beacon-backend/src/services/confusionService.js`, `beacon-backend/src/services/sectionInsightsService.js`
- **Impact:** High database load during live analytics viewing; slow response times with large datasets (100+ sessions)
- **Fix approach:** 
  - Add compound indexes on (test, status) and (test, startedAt) for Session queries
  - Cache analytics results in Redis or in-memory with TTL (5-10 min)
  - Batch analytics computation into a single aggregation pipeline rather than multiple queries
  - Consider marking old Sessions as "archived" to exclude from real-time queries

### Socket.io Polling Fallback in Production

- **Issue:** `src/lib/socket.ts` line 13 enables both WebSocket and HTTP long-polling transports: `transports: ['websocket', 'polling']`
  - Polling is 10-100x less efficient than WebSocket (more overhead, higher latency, more server load)
  - In production, if WebSocket negotiation fails (e.g., proxy misconfiguration), app silently falls back to polling and becomes sluggish
- **Files:** `src/lib/socket.ts`
- **Impact:** Unexpected slowness when WebSocket fails silently; poor real-time experience for participants and researchers
- **Fix approach:** 
  - In production, use `transports: ['websocket']` only; let it fail explicitly if WebSocket is unavailable
  - Add fallback UI when Socket.io is unavailable (show "real-time updates disabled" warning)
  - In development, allow polling for local testing without WebSocket support

## Fragile Areas

### Anonymous Session Provisioning Without Explicit Error Handling

- **Issue:** `src/contexts/AuthContext.tsx` lines 55-94: Silent session provisioning has no retry logic or exponential backoff:
  - If backend is temporarily unreachable, `startSession()` fails and the app leaves the user logged out
  - User sees no error message, just the loading screen
  - Subsequent navigations don't retry (no polling or retry-on-focus)
- **Files:** `src/contexts/AuthContext.tsx`
- **Why fragile:** Network timeouts, backend deployments, or transient errors leave users in a broken state permanently (until page refresh)
- **Safe modification:** Add retry logic with exponential backoff; show a "backend unreachable" message; retry when network comes back online (using `online` event)

### Module-Level Socket.io Singleton Without Connection State Tracking

- **Issue:** `src/lib/socket.ts` maintains a global `socket` variable with no state tracking for connection health:
  - If socket.disconnect() is called, socket is set to null, but listeners remain registered elsewhere
  - Reconnection logic is implicit in Socket.io but not centralized
  - No way to know if socket is actually connected vs. attempting reconnection
- **Files:** `src/lib/socket.ts`, `src/contexts/AuthContext.tsx` (uses socket singleton)
- **Why fragile:** Components subscribed to socket events may miss reconnection lifecycle; stale listeners accumulate if auth expires multiple times
- **Safe modification:** 
  - Track connection state explicitly (connecting, connected, reconnecting, disconnected)
  - Add a hook `useSocketStatus()` that components can query
  - Document socket lifecycle and listener cleanup requirements

### Retentiondays Configuration Without Enforcement

- **Issue:** Test model defines `retentionDays` (default 90) with a comment "session data older than this surfaces a warning in LiveAnalytics; no automatic deletion":
  - Configuration exists but has no corresponding cleanup job
  - Sessions older than retention period are never deleted; they accumulate indefinitely
  - GDPR/data residency compliance may require automatic deletion
- **Files:** `beacon-backend/src/models/Test.js` line 57, no cleanup logic found
- **Impact:** Database grows unbounded; compliance risk; GDPR/CCPA violations if user data isn't deleted after retention
- **Fix approach:** 
  - Implement a cron job or scheduled task that deletes Sessions older than retentionDays
  - Add lifecycle hooks to Test model to enforce cleanup on save
  - Log all deletions for audit trail
  - Add configuration for TTL index on Session documents

### Error Handling in AI Service Without Request Context Logging

- **Issue:** `beacon-backend/src/services/aiService.js` makes calls to OpenAI, Anthropic, OpenRouter with minimal logging:
  - Request start/end times not recorded
  - Failures only logged with error message, no context (input length, model, attempt count)
  - Cost calculation happens silently; no visibility into AI spending
- **Files:** `beacon-backend/src/services/aiService.js` lines 33-137
- **Why fragile:** Hard to debug AI-related issues; can't monitor cost or rate-limit overages; no visibility into provider failures
- **Safe modification:** 
  - Add structured logging for each AI request: model, provider, input tokens, output tokens, cost, latency
  - Log retry attempts and fallback provider selection
  - Emit metrics/events for monitoring total AI cost per test/user

## Test Coverage Gaps

### No Tests for Auth Flow

- **What's not tested:** 
  - Anonymous token provisioning (`POST /api/auth/start`)
  - Token validation and user lookup (`GET /api/auth/me`)
  - 401 error handling and silent re-provisioning
  - Token persistence in localStorage and URL parsing
- **Files:** `src/contexts/AuthContext.tsx`, `beacon-backend/src/routes/auth.js`
- **Risk:** Auth flow regressions reach production; users locked out unexpectedly
- **Priority:** High — this is the app's security boundary

### No Tests for Socket.io Event Handling

- **What's not tested:**
  - Participant join/event/leave flow
  - Frame attribution for events (resolveFrameId logic)
  - Real-time metric updates
  - Anonymous vs. authenticated participant scenarios
- **Files:** `src/lib/socket.ts`, `beacon-backend/src/socket/handlers.js`
- **Risk:** Real-time features break silently; participants' data misattributed to wrong frames
- **Priority:** High — central to product value

### No Tests for Test Context State Management

- **What's not tested:**
  - Test CRUD operations (create, update, delete)
  - Status transitions (draft → live → completed)
  - Error recovery and retries
  - Concurrent mutations
- **Files:** `src/contexts/TestContext.tsx`
- **Risk:** Data loss; inconsistent state; unexpected behavior when tests are modified
- **Priority:** Medium-High

### No Tests for Analytics Computation

- **What's not tested:**
  - Confusion zone detection algorithm
  - Dwell time calculation with edge cases (zero sessions, events out of order)
  - Section insight scoring and ranking
  - Heatmap intensity mapping
- **Files:** `beacon-backend/src/services/confusionService.js`, `sectionInsightsService.js`, `exportService.js`
- **Risk:** Incorrect analytics shown to researchers; research decisions based on flawed data
- **Priority:** High — core to product

### No Tests for Major UI Components

- **What's not tested:** LiveAnalytics filters, comparison metric display, heatmap interactivity, real-time metrics refresh
- **Files:** `src/screens/LiveAnalytics.tsx`, `src/screens/Comparison.tsx`, major components
- **Risk:** UI regressions go undetected; contributor confidence low
- **Priority:** Medium — functional coverage is more critical

## Missing Critical Features

### Automated Data Retention Enforcement

- **Problem:** `retentionDays` configuration is defined but not enforced. Sessions older than the configured retention period are never deleted.
- **Blocks:** GDPR/CCPA compliance; unbounded database growth; no automatic user data deletion on request
- **Solution:** Implement cron job or TTL index to auto-delete old sessions; audit cleanup operations

### AI Cost Visibility and Budgeting

- **Problem:** AI requests to OpenAI/Anthropic/OpenRouter are made without centralized cost tracking or budget enforcement
  - `beacon-backend/src/services/aiService.js` computes per-request cost but stores it nowhere
  - No way to query total spend per user or test
  - No budget limits to prevent runaway costs
- **Blocks:** Runaway API costs without warning; no cost forecasting; no per-user rate limiting
- **Solution:** Store AIInsight cost in model; aggregate costs in analytics; add budget enforcement middleware

### Error Boundaries and Graceful Degradation

- **Problem:** No React error boundaries in frontend screens. If any major component throws (e.g., during render), the entire app crashes
- **Blocks:** Single buggy component brings down whole app; poor user experience during edge cases
- **Solution:** Add error boundary wrapper around each screen; provide fallback UI and error logging

### Structured Logging and Observability

- **Problem:** `console.log` statements throughout codebase are human-readable but unstructured. Production logs are hard to search/aggregate:
  - No correlation IDs for tracing requests
  - No structured JSON format for log aggregation
  - No integration with monitoring tools (Sentry, DataDog, etc.)
- **Blocks:** Hard to debug issues in production; no alerting on error spikes; no performance profiling
- **Solution:** Add structured logging library (pino, winston); emit correlation IDs; integrate with observability platform

## Dependencies at Risk

### Socket.io Version and Transport Security

- **Risk:** `beacon-backend/package.json` uses `socket.io@^4.8.1`, `socket.io-client@^4.8.3` (exact pinning missing). Polling transport enabled in production context allows HTTP-only fallback.
- **Impact:** If WebSocket negotiation fails silently, app degrades to polling (inefficient); if WebSocket proxy is misconfigured, user doesn't know
- **Migration plan:** 
  - Pin Socket.io to specific version; test WebSocket thoroughly before deployment
  - Remove polling transport for production builds
  - Add explicit error if WebSocket unavailable instead of falling back

### TypeScript Strictness

- **Risk:** `tsconfig.json` uses `strict: true` but `src/` only partially scoped. `vite.config.ts` is excluded, meaning build config isn't type-checked
- **Impact:** Build config bugs aren't caught; inconsistent types across codebase
- **Migration plan:** Include `vite.config.ts` in type checking; audit any `any` type casts

## Dependency and Configuration Issues

### Duplicate npm Script in Root package.json

- **Issue:** `package.json` lines 9-10 define "typecheck" twice:
  ```json
  "typecheck": "tsc --noEmit",
  "typecheck": "tsc --noEmit",
  ```
- **Files:** `package.json`
- **Impact:** Confusing; second definition silently overrides first (no error, but maintainer confusion)
- **Fix approach:** Remove duplicate line

### Outdated .env.example References Removed Features

- **Issue:** `beacon-backend/.env.example` lines 10-11 reference `JWT_SECRET` and `JWT_EXPIRE`:
  ```
  JWT_SECRET=your_jwt_secret_key_here
  JWT_EXPIRE=7d
  ```
  These variables are not used in the current codebase (removed when login screen was deleted per CLAUDE.md).
- **Files:** `beacon-backend/.env.example`
- **Impact:** New developers copy outdated config; wasted time investigating unused variables
- **Fix approach:** Remove JWT variables from .env.example; add brief comment explaining auth is now anonymous token-based

### Encryption Key Generation Requires Manual Node Command

- **Issue:** CLAUDE.md requires `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` to generate ENCRYPTION_KEY. No automation or built-in generator.
- **Files:** CLAUDE.md, `beacon-backend/.env.example`
- **Impact:** Error-prone onboarding; typos in key generation; inconsistent key lengths if typed manually
- **Fix approach:** 
  - Add `npm run generate-encryption-key` script that outputs key to stdout
  - Add startup validation that ENCRYPTION_KEY is 64 hex characters (32 bytes)
  - Document in README

---

*Concerns audit: 2026-09-19*
