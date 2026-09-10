import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';
import Board from '../src/models/Board.js';
import Test from '../src/models/Test.js';
import Session from '../src/models/Session.js';

let server;
let token;
let testId;
let designerSessionId;
let pmSessionId;

before(async () => {
    server = await startTestServer();

    const authRes = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const authBody = await authRes.json();
    token = authBody.token;

    const board = await Board.create({ miroId: 'filters-board', name: 'Filters Board' });
    const t = await Test.create({
        name: 'Filters Test',
        board: board._id,
        researcher: authBody.user.id,
        settings: { minSampleSize: 2 },
    });
    testId = t._id.toString();

    const designerSession = await Session.create({
        test: t._id,
        status: 'completed',
        participant: { demographics: { role: 'Designer' } },
        events: [
            { type: 'click', frameId: 'frame-a', element: 'CTA', coordinates: { x: 1, y: 1 } },
        ],
    });
    designerSessionId = designerSession._id.toString();

    const pmSession = await Session.create({
        test: t._id,
        status: 'completed',
        participant: { demographics: { role: 'PM' } },
        events: [
            { type: 'click', frameId: 'frame-b', element: 'Nav', coordinates: { x: 2, y: 2 } },
        ],
    });
    pmSessionId = pmSession._id.toString();
});

after(async () => {
    await server.stop();
});

test('session-stats reports completedSessions and the test\'s configured minSampleSize', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/session-stats`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.completedSessions, 2);
    assert.equal(body.minSampleSize, 2);
});

test('GET /sessions lists sessions with their reported role, for the filter dropdowns', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const { sessions } = await res.json();
    assert.equal(sessions.length, 2);
    const roles = sessions.map((s) => s.role).sort();
    assert.deepEqual(roles, ['Designer', 'PM']);
});

test('?role= narrows the elements rollup to sessions with that reported role', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/elements?role=Designer`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.totalSessions, 1);
    assert.deepEqual(body.elements.map((e) => e.element), ['CTA']);
});

test('?sessionId= narrows the elements rollup to one session', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/elements?sessionId=${pmSessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    assert.equal(body.totalSessions, 1);
    assert.deepEqual(body.elements.map((e) => e.element), ['Nav']);
});

test('an unrecognized sessionId returns an empty result instead of a 500', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/elements?sessionId=not-a-real-id`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.totalSessions, 0);
});

test('?sectionId= narrows the elements rollup to events in that board section', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/elements?sectionId=frame-a`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    assert.deepEqual(body.elements.map((e) => e.element), ['CTA']);
});

test('summary respects the same filters', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/summary?role=PM`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    assert.equal(body.totalSessions, 1);
});

test('no filters returns every session', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/elements`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    assert.equal(body.totalSessions, 2);
});
