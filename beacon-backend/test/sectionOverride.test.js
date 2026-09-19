import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';
import Board from '../src/models/Board.js';
import Test from '../src/models/Test.js';
import Session from '../src/models/Session.js';

let server;
let token;
let otherToken;
let testId;

before(async () => {
    server = await startTestServer();

    const authRes = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const authBody = await authRes.json();
    token = authBody.token;

    const otherAuthRes = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const otherAuthBody = await otherAuthRes.json();
    otherToken = otherAuthBody.token;

    const board = await Board.create({
        miroId: 'override-board',
        name: 'Override Board',
        elements: [{ miroId: 'frame-a', type: 'frame', content: 'Frame A' }],
    });
    const t = await Test.create({
        name: 'Override Test',
        board: board._id,
        researcher: authBody.user.id,
    });
    testId = t._id.toString();

    await Session.create({
        test: t._id,
        status: 'completed',
        events: [
            { type: 'click', frameId: 'frame-a', element: 'CTA', coordinates: { x: 1, y: 1 } },
        ],
    });
});

after(async () => {
    await server.stop();
});

test('a section has no override by default', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const section = body.sections.find((s) => s.frameId === 'frame-a');
    assert.equal(section.override, null);
});

test('PATCH sets an owner override, reflected in GET /sections', async () => {
    const patchRes = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections/frame-a/override`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'likely_confusion', note: 'Saw 3 users hesitate here' }),
    });
    assert.equal(patchRes.status, 200);

    const getRes = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await getRes.json();
    const section = body.sections.find((s) => s.frameId === 'frame-a');
    assert.equal(section.override.outcome, 'likely_confusion');
    assert.equal(section.override.note, 'Saw 3 users hesitate here');
    assert.ok(section.override.overriddenAt);
    // the classifier's own read stays intact alongside the override
    assert.ok(section.outcome);
});

test('rejects an invalid outcome value', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections/frame-a/override`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'not_a_real_outcome' }),
    });
    assert.equal(res.status, 400);
});

test('rejects an override attempt from a non-owner', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections/frame-a/override`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${otherToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'normal' }),
    });
    assert.equal(res.status, 403);
});

test('DELETE clears an override back to auto-classification', async () => {
    await fetch(`${server.baseUrl}/api/analytics/${testId}/sections/frame-a/override`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome: 'likely_high_interest' }),
    });

    const delRes = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections/frame-a/override`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(delRes.status, 200);

    const getRes = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await getRes.json();
    const section = body.sections.find((s) => s.frameId === 'frame-a');
    assert.equal(section.override, null);
});
