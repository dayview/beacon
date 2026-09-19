---
last_mapped_commit: 436a72b6ec40c88af8835c467bd006867be86e40
last_mapped_at: 2026-09-19
---
# Testing Patterns

**Analysis Date:** 2026-09-19

## Test Framework

**Runner:**

- Node.js native test runner (`node:test`)
- Config: none; tests discover automatically
- Version: Node 18.0.0+ required (see `beacon-backend/package.json`)

**Assertion Library:**

- `node:assert/strict` (Node's built-in strict assertion module)
- Used for all assertions (e.g., `assert.equal()`, `assert.deepEqual()`, `assert.throws()`)

**Run Commands:**

```bash
npm run test                    # Run all tests (backend only; frontend has no tests)
node --test test/*.test.js    # Direct invocation
```

**Location:**

- Backend tests: `beacon-backend/test/` directory
- Frontend: no test files or test runner configured

## Test File Organization

**Location:**

- Backend: `beacon-backend/test/*.test.js` (co-located in test directory, not next to source)
- Pattern: one test file per feature/module (e.g., `auth.test.js`, `encryption.test.js`, `sectionOverride.test.js`)

**Naming:**

- Files: kebab-case with `.test.js` suffix (e.g., `analytics-filters.test.js`, `admin-scoping.test.js`)
- Tests: descriptive strings in `test()` calls, no test name prefixes

**Structure:**

```
beacon-backend/test/
├── helpers/
│   └── testServer.js          # Test server setup; used by all integration tests
├── auth.test.js               # Unit tests (no server startup)
├── encryption.test.js         # Unit tests
├── piiRedaction.test.js       # Unit tests
├── sectionOverride.test.js    # Integration tests (server startup)
├── analyticsFilters.test.js   # Integration tests
└── [other tests...]
```

## Test Structure

**Module Imports:**

```javascript
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';
```

**Test Suite Organization (Integration Example):**

```javascript
let server;
let token;

before(async () => {
    server = await startTestServer();
    const authRes = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const authBody = await authRes.json();
    token = authBody.token;
});

after(async () => {
    await server.stop();
});

test('description of test', async () => {
    const res = await fetch(`${server.baseUrl}/api/endpoint`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(res.status, 200);
});
```

**Test Suite Organization (Unit Example):**

```javascript
let encrypt, decrypt;

before(async () => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    ({ encrypt, decrypt } = await import('../src/services/encryptionService.js'));
});

test('description', () => {
    const result = encrypt('plaintext');
    assert.notEqual(result, 'plaintext');
});
```

**Patterns:**

- `before()` hook: initialize test fixtures, start server, set environment variables
- `after()` hook: clean up database, stop server, close connections
- Each `test()` runs sequentially within a file; files may run concurrently (unique test DB URIs prevent conflicts)
- Shared state: file-level variables (e.g., `token`, `server`, `testId`) used across tests

## Mocking

**Framework:** 

- No mocking library (jest, sinon, etc.)
- Tests hit the real backend server via HTTP (integration-style)
- Test database is real MongoDB instance with unique suffix per test file

**Patterns:**

```javascript
// Database setup/teardown approach:
// Each test file gets a unique database to avoid conflicts
const BASE_TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/beacon_test';
function uniqueTestDatabaseUri() {
    const suffix = crypto.randomBytes(4).toString('hex');
    const url = new URL(BASE_TEST_MONGODB_URI);
    url.pathname = `${url.pathname}_${suffix}`;
    return url.toString();
}

// Database clearing between tests (see testServer.js):
export async function clearDatabase() {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
}
```

**What to Mock:**

- Integration tests don't mock; they use real HTTP calls to real server
- No mocking of services/functions
- Real MongoDB database (test instance) used for all integration tests

**What NOT to Mock:**

- HTTP endpoints (tests call real routes)
- Database (tests use real MongoDB test instance)
- External services like Miro (no tests for OAuth flows; SSRF test exists but doesn't mock the OAuth provider)

## Fixtures and Factories

**Test Data:**

```javascript
// Directly creating Mongoose documents in before() hook:
const board = await Board.create({
    miroId: 'override-board',
    name: 'Override Board',
    elements: [{ miroId: 'frame-a', type: 'frame', content: 'Frame A' }],
});

const test = await Test.create({
    name: 'Override Test',
    board: board._id,
    researcher: authBody.user.id,
});

const session = await Session.create({
    test: test._id,
    status: 'completed',
    events: [{ type: 'click', frameId: 'frame-a', element: 'CTA', coordinates: { x: 1, y: 1 } }],
});
```

**Location:**

- Fixtures created inline in `before()` hooks, stored as file-level variables
- No separate fixture files or factory functions
- Minimal data: only required fields for test to pass

## Coverage

**Requirements:** 

- No coverage target enforced
- No `--coverage` flag or coverage report generation

**View Coverage:**

- Not configured; would require tool like `c8` or `nyc` (not present in dependencies)

## Test Types

**Unit Tests:**

- Scope: single function or service (e.g., encryption, PII redaction)
- Approach: direct function call with sample inputs, assertions on output
- Example: `encryption.test.js`, `piiRedaction.test.js`
- Helpers: none; test functions directly
- Database: not used (no I/O)

**Integration Tests:**

- Scope: full HTTP endpoint behavior with database persistence
- Approach: fetch() to real server via unique test database
- Example: `auth.test.js`, `sectionOverride.test.js`, `analyticsFilters.test.js`
- Helpers: `testServer.js` (starts Express server on ephemeral port)
- Database: fresh MongoDB test database per test file

**E2E Tests:**

- Framework: not used
- No Cypress, Playwright, or other browser-based tests configured

## Common Patterns

**Async Testing:**

```javascript
test('description', async () => {
    const res = await fetch(`${server.baseUrl}/api/endpoint`, { method: 'POST' });
    const body = await res.json();
    assert.equal(body.field, expectedValue);
});
```

**Error Testing:**

```javascript
test('a tampered ciphertext body is rejected', () => {
    const ciphertext = encrypt('secret');
    const [iv, tag, body] = ciphertext.split(':');
    const flippedLastByte = body.slice(0, -2) + (body.slice(-2) === '00' ? '11' : '00');
    assert.throws(() => decrypt(`${iv}:${tag}:${flippedLastByte}`));
});

test('rejects an invalid outcome value', async () => {
    const res = await fetch(`...`, {
        method: 'PATCH',
        body: JSON.stringify({ outcome: 'not_a_real_outcome' }),
    });
    assert.equal(res.status, 400);
});
```

**Authentication/Authorization Testing:**

```javascript
test('a protected route rejects requests with no token', async () => {
    const res = await fetch(`${server.baseUrl}/api/tests`);
    assert.equal(res.status, 401);
});

test('rejects an override attempt from a non-owner', async () => {
    const res = await fetch(`...`, {
        headers: { Authorization: `Bearer ${otherToken}` },
        method: 'PATCH',
        body: JSON.stringify({ outcome: 'normal' }),
    });
    assert.equal(res.status, 403);
});
```

**Multiple Sessions/Users:**

```javascript
// Create multiple tokens/sessions in before():
const authRes1 = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
const token1 = (await authRes1.json()).token;

const authRes2 = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
const token2 = (await authRes2.json()).token;

// Use in different tests:
test('user 1 can do X', async () => {
    const res = await fetch(`...`, { headers: { Authorization: `Bearer ${token1}` } });
    // ...
});

test('user 2 sees different data', async () => {
    const res = await fetch(`...`, { headers: { Authorization: `Bearer ${token2}` } });
    // ...
});
```

**Query Parameter Testing:**

```javascript
test('?role= narrows the result to sessions with that role', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/elements?role=Designer`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    assert.equal(body.totalSessions, 1);
});

test('unrecognized query param returns empty gracefully', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/elements?sessionId=not-a-real-id`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.totalSessions, 0);
});
```

## Test Organization by Feature

**Currently Tested Features:**

- `auth.test.js`: token provisioning, authentication, bearer token vs. query param
- `encryption.test.js`: AES-256-GCM encrypt/decrypt, tampering detection, backward compat
- `piiRedaction.test.js`: email/phone redaction in demographics, non-string passthrough
- `analyticsFilters.test.js`: session filtering by role, session ID, section ID; filter application across endpoints
- `sectionOverride.test.js`: section classifier override (PATCH/DELETE), authorization scoping
- `adminScoping.test.js`: admin visibility scoping (researcher ownership checks)
- `idleTime.test.js`: idle-time detection in free-exploration sections
- `readingOrder.test.js`: reading-order backtrack detection from canonical frame order
- `zoomRepeat.test.js`: zoom-reversal detection from poll-based zoom events
- `miroSsrf.test.js`: Miro OAuth SSRF protection (malformed redirect_uri rejection)
- `export.test.js`: CSV/XLSX export file download and content validation

**Not Tested (Frontend):**

- React components have no unit or integration tests
- No UI testing framework configured
- Manual testing required for frontend behavior

## Running Tests

**All tests:**

```bash
cd beacon-backend
npm run test                    # runs: node --test test/*.test.js
```

**Single test file:**

```bash
cd beacon-backend
node --test test/auth.test.js
```

**With watch (re-run on file change):**

- Not built-in; requires external tool like `nodemon` or `tsx --watch`
- Not currently configured

**Environment Variables:**

- Tests read `TEST_MONGODB_URI` env var (defaults to `mongodb://127.0.0.1:27017/beacon_test`)
- Each test file gets a uniquely suffixed database to allow concurrent execution
- Other env vars (e.g., `ENCRYPTION_KEY`) set programmatically in test setup

## Common Test Failures

**MongoDB Connection Error:**

- Ensure MongoDB is running locally on `127.0.0.1:27017`
- Or set `TEST_MONGODB_URI` to your test database URL

**Port Conflict:**

- Test server uses ephemeral port (port 0); no conflict expected
- If manual server running on 3001, backend dev server will compete (see CLAUDE.md)

**Test Isolation:**

- Each test file connects to its own unique database suffix
- Tests within a file are sequential, but files run concurrently
- If tests fail inconsistently, likely a shared-state or async ordering issue
- Use `clearDatabase()` helper between tests if needed (not currently used)

---

*Testing analysis: 2026-09-19*
