# Beacon Backend

Backend server for the Beacon usability testing platform — Node.js + Express + Socket.io + MongoDB.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials (MongoDB URI, JWT secret, etc.)

# 3. Generate an encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the output into ENCRYPTION_KEY in .env

# 4. Start the server
npm run dev    # development (auto-reload)
npm start      # production
```

## API Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | — | Register a new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | ✓ | Get current user |
| GET | `/api/miro/connect` | ✓ | Miro OAuth callback |
| GET | `/api/miro/boards` | ✓ | List Miro boards |
| POST | `/api/miro/sync/:boardId` | ✓ | Sync a Miro board |
| POST | `/api/tests` | ✓ | Create test |
| GET | `/api/tests` | ✓ | List tests |
| GET | `/api/tests/:id` | ✓ | Get test details |
| PATCH | `/api/tests/:id` | ✓ | Update test |
| DELETE | `/api/tests/:id` | ✓ | Delete test |
| POST | `/api/tests/:id/start` | ✓ | Start a test |
| GET | `/api/tests/:id/sessions` | ✓ | List test sessions |
| GET | `/api/sessions/:id` | ✓ | Get session details |
| GET | `/api/sessions/:id/events` | ✓ | Get session events |
| POST | `/api/sessions/:id/complete` | ✓ | Complete session |
| POST | `/api/ai/analyze/:sessionId` | ✓ | AI session analysis |
| GET | `/api/ai/insights/:testId` | ✓ | List AI insights |
| GET | `/api/analytics/:testId/elements` | ✓ | Element-level interaction rollup |
| GET | `/api/analytics/:testId/confusion` | ✓ | Confusion zone detection |
| GET | `/api/analytics/:testId/dwell` | ✓ | Dwell-time summary per element |
| GET | `/api/analytics/:testId/flow` | ✓ | Navigation path analysis |
| GET | `/api/analytics/:testId/scroll-depth` | ✓ | Scroll depth distribution |
| GET | `/api/analytics/:testId/summary` | ✓ | Combined analytics summary |
| POST | `/api/workspaces` | ✓ | Create workspace |
| GET | `/api/workspaces` | ✓ | List user workspaces |
| GET | `/api/workspaces/:id` | ✓ | Get workspace details |
| PATCH | `/api/workspaces/:id` | ✓ | Update workspace |
| DELETE | `/api/workspaces/:id` | ✓ | Delete workspace |
| POST | `/api/workspaces/:id/members` | ✓ | Add member by email |
| DELETE | `/api/workspaces/:id/members/:userId` | ✓ | Remove member |
| POST | `/api/heatmaps/generate/:testId` | ✓ | Generate heatmap (click/attention/scroll) |
| GET | `/api/heatmaps/:testId` | ✓ | List heatmaps for test |
| GET | `/api/heatmaps/:testId/:type` | ✓ | Get specific heatmap type |
| GET | `/health` | — | Health check |

## WebSocket Events

Connect to the server with Socket.io:

```javascript
import { io } from 'socket.io-client';
const socket = io('http://localhost:3001', {
  auth: { token: 'your-jwt-token' }
});
```

**Participant → Server**: `session:join`, `session:event`, `session:complete`
**Server → Researchers**: `participant:joined`, `participant:event`, `participant:left`, `test:updated`
**Server → Participants**: `task:update`, `test:ended`

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

## Deployment

Designed for Railway / Render / Fly.io. Set all env vars in the platform dashboard and deploy the `beacon-backend/` directory.
