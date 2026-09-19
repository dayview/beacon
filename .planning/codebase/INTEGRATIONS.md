---
last_mapped_commit: 436a72b6ec40c88af8835c467bd006867be86e40
last_mapped_at: 2026-09-19
---
# External Integrations

**Analysis Date:** 2026-09-19

## APIs & External Services

**Miro Whiteboarding Platform:**

- **SDK**: `@mirohq/websdk-types` 2.17.2 (frontend); native `miro` global object in Miro-embedded iframe
- **Auth**: OAuth 2.0 token exchange
  - Client credentials: `MIRO_CLIENT_ID`, `MIRO_CLIENT_SECRET`
  - Token endpoint: `https://api.miro.com/v1/oauth/token`
  - Callback: `MIRO_REDIRECT_URI` (default `http://localhost:3001/api/miro/callback`)
- **What it's used for**: 
  - Board introspection (frames, elements, zoom, viewport)
  - Real-time cursor/selection tracking in embedded Miro panel (`miro.board.ui.on('selection:update')`, `experimental:cursor_position_changed`)
  - Live embed iframes for test participants (`https://miro.com/app/live-embed/{boardUrl}`)
  - OAuth flow in `beacon-backend/src/routes/miro.js` and `src/services/miroService.js`
- **Key files**:
  - `src/screens/MiroPanel.tsx` — Miro SDK event listeners
  - `src/screens/BoardCanvas.tsx` — Miro live-embed iframe
  - `beacon-backend/src/services/miroService.js` — Token exchange, refresh, API calls

**AI Provider APIs (Multi-provider, user-selectable):**

- **OpenAI**: 
  - Endpoint: `https://api.openai.com/v1/chat/completions`
  - Model: `gpt-4o`
  - Auth: Bearer token (`BEACON_OPENAI_KEY` or user's `plan.aiApiKey`)
  
- **OpenRouter**:
  - Endpoint: `https://openrouter.ai/api/v1/chat/completions`
  - Model: `meta-llama/llama-3.3-70b-instruct:free`
  - Auth: Bearer token (user's `plan.aiApiKey`)
  
- **Anthropic**:
  - Endpoint: `https://api.anthropic.com/v1/messages`
  - Model: `claude-3-5-sonnet-20241022`
  - Auth: API key header (`x-api-key`)
  
- **Custom endpoint**:
  - User-supplied endpoint URL + auth headers (`plan.customAiEndpoint`, `plan.customAiHeaders`)
  
- **What it's used for**: 
  - Session analysis and AI-powered insights generation (`POST /api/ai/analyze/:sessionId`)
  - Cost tracking (OpenAI, OpenRouter, Anthropic pricing tables in `aiService.js`)
  - Falling back to pooled `BEACON_OPENAI_KEY` if user has no personal key set
- **Key files**:
  - `beacon-backend/src/services/aiService.js` — Provider abstraction, cost computation
  - `beacon-backend/src/routes/ai.js` — Analysis endpoints

## Data Storage

**Databases:**

**MongoDB**:

- **Connection**: `MONGODB_URI` environment variable (MongoDB Atlas SRV or self-hosted)
- **Client**: Mongoose 8.10.1 ODM
- **Retry Logic**: 5 attempts with exponential backoff (2s, 4s, 8s, 16s, 32s)
- **DNS**: Forces Google (8.8.8.8) / Cloudflare (1.1.1.1) DNS for SRV record resolution
- **Collections** (models in `beacon-backend/src/models/`):
  - `User` — Anonymous owners with access tokens, encrypted Miro/AI tokens
  - `Test` — Usability test definitions (name, description, tasks, board reference)
  - `Session` — Participant session data (start time, events, completion status)
  - `Board` — Synced Miro board structure (frames, elements, layout)
  - `Heatmap` — Cached/generated heatmap data (click, attention, scroll types)
  - `AIInsight` — Generated AI analysis results
  - `Template` — Test templates (seeded via `src/seed-templates.js`)

**File Storage:**

- Not detected — no integration with S3, GCS, or external blob storage. All data in MongoDB.

**Caching:**

- None configured (no Redis, Memcached, or in-memory cache layer)

## Authentication & Identity

**Auth Provider:**

- **Custom anonymous token-based** (no OAuth sign-in, no accounts)
  - `POST /api/auth/start` provisions an anonymous `User` with a random 24-byte hex `accessToken`
  - Token stored in frontend `localStorage` under `beacon-token` (see `src/lib/api.ts`)
  - Bearer token auth in `Authorization: Bearer {token}` header; also supports `?token=` query param for cross-origin embeds
  - No JWT, no expiry, no refresh cycle — token is permanent until explicitly deleted

**Miro OAuth tokens** (stored encrypted in `User.miroTokens`):

- `accessToken` — Used for API calls to `https://api.miro.com/v2/...`
- `refreshToken` — Refreshed via `https://api.miro.com/v1/oauth/token` when `accessToken` expires
- `expiresAt` — Expiry timestamp

**Middleware:**

- `beacon-backend/src/middleware/auth.js` — Extracts token from header or query, looks up `User.accessToken`, attaches user doc to `req.user`
- Socket.io handshake auth (same mechanism) in `beacon-backend/src/socket/handlers.js`

## Encryption

**Data at Rest:**

- **User AI API Keys**: AES-256-GCM encrypted before storage in MongoDB
  - Key: `ENCRYPTION_KEY` (64-char hex string, 32 bytes)
  - IV (nonce): 12 random bytes per encryption
  - Auth tag: Authenticated encryption prevents tampering
  - Format: `iv:authTag:encrypted` (hex-encoded)
  - Implementation: `beacon-backend/src/services/encryptionService.js`
- **Miro OAuth tokens**: Also encrypted with same algorithm

**Transport:**

- HTTPS recommended in production (not enforced in code; depends on deployment)

## Monitoring & Observability

**Error Tracking:**

- Not detected (no Sentry, Rollbar, or third-party error service integration)

**Logging:**

- Console-based (`console.error`, `console.log`, `console.warn`)
- Backend logs connection state changes, retry attempts, OAuth errors, MongoDB connect/disconnect events
- No centralized log aggregation

## CI/CD & Deployment

**Hosting:**

- Reference in code: `https://beacon-4rtv.onrender.com/` (OpenRouter referer header in `aiService.js`)
- Suggests Render.com deployment for production

**CI Pipeline:**

- Not detected (no GitHub Actions, GitLab CI, or other CI config in repo)

## CORS & Security Headers

**CORS** (`beacon-backend/src/server.js`):

- Allowed origin: `FRONTEND_URL` (default `http://localhost:5173`)
- Credentials allowed: `true`
- Scoped for dev; must be reconfigured in production

**Helmet CSP** (Content Security Policy):

- `frame-src`: `'self'`, `https://miro.com`, `https://*.miro.com` — allows embedding under Miro
- `frame-ancestors`: Same as above — allows Miro to embed this app as iframe
- `img-src`: `'self'`, `data:`, `blob:`, `https://*.miro.com` — assets + Miro images
- `connect-src`: `'self'`, `wss:`, `ws:`, `https://*.miro.com` — API calls, WebSocket, Miro SDKs

## WebSocket Configuration

**Socket.io** (real-time):

- Server: `socket.io` 4.8.1 on backend
- Client: `socket.io-client` 4.8.3 in frontend
- Rooms: `test:{testId}` (researchers join to observe live)
- Auth: Same bearer token as REST API
- Handshake: Allows anonymous participants (no owner session required)
- Events (in `beacon-backend/src/socket/events.js`):
  - **Participant → Server**: `session:join`, `session:event`, `session:complete`
  - **Server → Researchers**: `participant:joined`, `participant:event`, `participant:left`, `test:updated`
  - **Server → Participants**: `task:update`, `test:ended`

## Environment Configuration

**Required env vars:**

**Frontend** (`.env`):

- `VITE_API_URL` — Backend API base URL (optional in dev; proxied to `localhost:3001`). Example: `http://localhost:3001/api`

**Backend** (`.env`):

- `PORT` — Express listen port (default `3001`)
- `NODE_ENV` — `development` or `production`
- `FRONTEND_URL` — Frontend origin for CORS (default `http://localhost:5173`)
- `MONGODB_URI` — MongoDB connection string (required; no default)
- `ENCRYPTION_KEY` — 64-char hex AES key (required; generate via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `MIRO_CLIENT_ID` — Miro OAuth app ID (required for `/api/miro/*` endpoints)
- `MIRO_CLIENT_SECRET` — Miro OAuth app secret (required)
- `MIRO_REDIRECT_URI` — OAuth callback URL (default `http://localhost:3001/api/miro/callback`)
- `BEACON_OPENAI_KEY` — Pooled OpenAI key, fallback if user has no personal key

**Optional:**

- `BACKEND_PROXY_TARGET` — Override Vite proxy target (default `http://localhost:3001`)

**Secrets location:**

- `.env` files (not committed; `.env.example` provided for reference)
- Encrypted in MongoDB: User's personal AI API keys, Miro refresh tokens

## Webhooks & Callbacks

**Incoming:**

- Miro OAuth callback: `MIRO_REDIRECT_URI` (typically `/api/miro/callback`)
- Health check: `GET /health` (no auth required)

**Outgoing:**

- None detected (Beacon is pull-based, not event-driven for external systems)

---

*Integration audit: 2026-09-19*
