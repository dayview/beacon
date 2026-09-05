import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { startTestServer } from './helpers/testServer.js';
import User from '../src/models/User.js';

let server;
let token;

before(async () => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    server = await startTestServer();

    const res = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const body = await res.json();
    token = body.token;

    // Attach a fake but valid (non-expired) Miro token so the route gets
    // past getValidToken() and reaches the URL-validation logic under test.
    const user = await User.findById(body.user.id);
    user.setMiroTokens({
        accessToken: 'fake-miro-access-token',
        refreshToken: 'fake-refresh',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    await user.save();
});

after(async () => {
    await server.stop();
});

async function thumbnailRequest(url) {
    return fetch(
        `${server.baseUrl}/api/miro/thumbnails/fakeboard?url=${encodeURIComponent(url)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
}

test('a cloud-metadata URL is rejected before any outbound fetch', async () => {
    const res = await thumbnailRequest('http://169.254.169.254/latest/meta-data/');
    assert.equal(res.status, 400);
});

test('a lookalike domain is rejected', async () => {
    const res = await thumbnailRequest('https://evil-miro.com/x.png');
    assert.equal(res.status, 400);
});

test('a userinfo-trick URL is rejected', async () => {
    const res = await thumbnailRequest('https://miro.com@evil.com/pic.png');
    assert.equal(res.status, 400);
});

test('a protocol downgrade to plain http on the real miro.com host is rejected', async () => {
    const res = await thumbnailRequest('http://miro.com/x.png');
    assert.equal(res.status, 400);
});

test('a genuine https://*.miro.com URL passes validation (not rejected as invalid)', async () => {
    const res = await thumbnailRequest('https://content.miro.com/does-not-exist.png');
    // Whatever happens on the actual outbound fetch (network-dependent, not
    // under test here) it must not be our own 400 validation rejection.
    assert.notEqual(res.status, 400);
});

test('the route still requires authentication', async () => {
    const res = await fetch(`${server.baseUrl}/api/miro/thumbnails/fakeboard?url=http://example.com`);
    assert.equal(res.status, 401);
});
