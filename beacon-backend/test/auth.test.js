import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';

let server;

before(async () => {
    server = await startTestServer();
});

after(async () => {
    await server.stop();
});

test('POST /api/auth/start provisions a new anonymous user with an access token', async () => {
    const res = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(typeof body.token, 'string');
    assert.ok(body.token.length > 0);
    assert.equal(body.user.hasMiroConnected, false);
});

test('a protected route rejects requests with no token', async () => {
    const res = await fetch(`${server.baseUrl}/api/tests`);
    assert.equal(res.status, 401);
});

test('a protected route rejects an invalid/garbage token', async () => {
    const res = await fetch(`${server.baseUrl}/api/tests`, {
        headers: { Authorization: 'Bearer not-a-real-token' },
    });
    assert.equal(res.status, 401);
});

test('a protected route accepts a valid token via the Authorization header', async () => {
    const start = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const { token } = await start.json();

    const res = await fetch(`${server.baseUrl}/api/tests`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.tests, []);
});

test('a protected route also accepts the token via ?token= query param', async () => {
    const start = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const { token } = await start.json();

    const res = await fetch(`${server.baseUrl}/api/tests?token=${token}`);
    assert.equal(res.status, 200);
});
