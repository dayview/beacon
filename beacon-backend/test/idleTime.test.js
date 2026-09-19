import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';
import Board from '../src/models/Board.js';
import Test from '../src/models/Test.js';
import Session from '../src/models/Session.js';

let server;
let token;
let testId;

before(async () => {
    server = await startTestServer();

    const authRes = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const authBody = await authRes.json();
    token = authBody.token;

    const board = await Board.create({
        miroId: 'idle-board',
        name: 'Idle Board',
        elements: [
            { miroId: 'frame-long-gap', type: 'frame', content: 'Long Gap' },
            { miroId: 'frame-short-gap', type: 'frame', content: 'Short Gap' },
        ],
    });
    const t = await Test.create({
        name: 'Idle Test',
        board: board._id,
        researcher: authBody.user.id,
    });
    testId = t._id.toString();

    // Free-exploration session (no tasks -> no dwellMs), with equal click
    // density on both frames so density alone stays "normal" for both —
    // the only difference between the two frames is the idle gap between
    // their two hover events, so the idle signal is what should decide it.
    const t0 = Date.now();
    await Session.create({
        test: t._id,
        status: 'completed',
        events: [
            { type: 'hover', frameId: 'frame-long-gap', coordinates: { x: 1, y: 1 }, timestamp: new Date(t0) },
            { type: 'hover', frameId: 'frame-long-gap', coordinates: { x: 1, y: 1 }, timestamp: new Date(t0 + 60000) },
            { type: 'hover', frameId: 'frame-short-gap', coordinates: { x: 2, y: 2 }, timestamp: new Date(t0 + 200000) },
            { type: 'hover', frameId: 'frame-short-gap', coordinates: { x: 2, y: 2 }, timestamp: new Date(t0 + 216000) },
        ],
    });
});

after(async () => {
    await server.stop();
});

test('a section with an idle gap well above the test median is flagged prolonged_dwell', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const section = body.sections.find((s) => s.frameId === 'frame-long-gap');
    assert.equal(section.outcome, 'prolonged_dwell');
    assert.equal(section.avgIdleMs, 60000);
    assert.match(section.explanation, /idle|pause/i);
});

test('a section with an idle gap near the test median is not flagged', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const section = body.sections.find((s) => s.frameId === 'frame-short-gap');
    assert.notEqual(section.outcome, 'prolonged_dwell');
    assert.equal(section.avgIdleMs, 16000);
});
