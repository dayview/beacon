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
        miroId: 'zoom-board',
        name: 'Zoom Board',
        elements: [
            { miroId: 'frame-oscillating', type: 'frame', content: 'Oscillating', bounds: { x: 0, y: 0, width: 100, height: 100 } },
            { miroId: 'frame-steady', type: 'frame', content: 'Steady', bounds: { x: 200, y: 0, width: 100, height: 100 } },
        ],
    });
    const t = await Test.create({
        name: 'Zoom Test',
        board: board._id,
        researcher: authBody.user.id,
    });
    testId = t._id.toString();

    const zoomEvent = (frameId, frameCenter, zoom, offsetMs) => ({
        type: 'zoom',
        frameId,
        coordinates: frameCenter,
        timestamp: new Date(Date.now() + offsetMs),
        metadata: { zoom },
    });

    // Equal click density on both frames so density alone stays "normal" for
    // both, isolating the zoom-reversal signal as the deciding factor.
    const clickEvent = (frameId, frameCenter, offsetMs) => ({
        type: 'click',
        frameId,
        coordinates: frameCenter,
        timestamp: new Date(Date.now() + offsetMs),
    });

    const oscillatingCenter = { x: 50, y: 50 };
    const steadyCenter = { x: 250, y: 50 };

    // frame-oscillating: zoom in, out, in, out -> 3 direction reversals.
    await Session.create({
        test: t._id,
        status: 'completed',
        events: [
            clickEvent('frame-oscillating', oscillatingCenter, 0),
            clickEvent('frame-oscillating', oscillatingCenter, 1000),
            zoomEvent('frame-oscillating', oscillatingCenter, 1.0, 2000),
            zoomEvent('frame-oscillating', oscillatingCenter, 2.0, 3000),
            zoomEvent('frame-oscillating', oscillatingCenter, 1.0, 4000),
            zoomEvent('frame-oscillating', oscillatingCenter, 2.0, 5000),
            zoomEvent('frame-oscillating', oscillatingCenter, 1.0, 6000),
        ],
    });

    // frame-steady: zoom in monotonically -> 0 reversals.
    await Session.create({
        test: t._id,
        status: 'completed',
        events: [
            clickEvent('frame-steady', steadyCenter, 0),
            clickEvent('frame-steady', steadyCenter, 1000),
            zoomEvent('frame-steady', steadyCenter, 1.0, 2000),
            zoomEvent('frame-steady', steadyCenter, 1.5, 3000),
            zoomEvent('frame-steady', steadyCenter, 2.0, 4000),
        ],
    });
});

after(async () => {
    await server.stop();
});

test('a section with oscillating zoom is flagged prolonged_dwell', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    const section = body.sections.find((s) => s.frameId === 'frame-oscillating');
    assert.equal(section.outcome, 'prolonged_dwell');
    assert.equal(section.avgZoomReversals, 3);
    assert.match(section.explanation, /zoom/i);
});

test('a section with monotonic zoom is not flagged', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    const section = body.sections.find((s) => s.frameId === 'frame-steady');
    assert.notEqual(section.outcome, 'prolonged_dwell');
    assert.equal(section.avgZoomReversals, 0);
});
