import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from './helpers/testServer.js';
import Board from '../src/models/Board.js';
import Test from '../src/models/Test.js';
import Session from '../src/models/Session.js';

let server;
let token;
let orderedTestId;
let missingBoundsTestId;

before(async () => {
    server = await startTestServer();

    const authRes = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const authBody = await authRes.json();
    token = authBody.token;

    // Three frames stacked top to bottom -> canonical reading order is
    // frame-top, frame-middle, frame-bottom. Equal click density on every
    // frame in every session keeps density-based classification "typical"
    // (0.5-1.5x median) for all three, so density alone never resolves the
    // section and the reading-order backtrack signal is what decides it.
    const orderedBoard = await Board.create({
        miroId: 'order-board',
        name: 'Order Board',
        elements: [
            { miroId: 'frame-top', type: 'frame', content: 'Top', bounds: { x: 0, y: 0, width: 100, height: 100 } },
            { miroId: 'frame-middle', type: 'frame', content: 'Middle', bounds: { x: 0, y: 100, width: 100, height: 100 } },
            { miroId: 'frame-bottom', type: 'frame', content: 'Bottom', bounds: { x: 0, y: 200, width: 100, height: 100 } },
        ],
    });
    const orderedTest = await Test.create({
        name: 'Order Test',
        board: orderedBoard._id,
        researcher: authBody.user.id,
    });
    orderedTestId = orderedTest._id.toString();

    const clicksOn = (frameId, n, startX) =>
        Array.from({ length: n }, (_, i) => ({
            type: 'click',
            frameId,
            coordinates: { x: startX + i, y: 1 },
        }));

    // Session A visits in canonical order: top, middle, bottom. No backtrack.
    await Session.create({
        test: orderedTest._id,
        status: 'completed',
        events: [
            ...clicksOn('frame-top', 2, 0),
            ...clicksOn('frame-middle', 2, 10),
            ...clicksOn('frame-bottom', 2, 20),
        ],
    });

    // Session B visits top, bottom, then back to middle -> middle's canonical
    // index (1) is lower than the peak already reached (bottom, index 2), so
    // returning to middle is a reading-order backtrack attributed to middle.
    await Session.create({
        test: orderedTest._id,
        status: 'completed',
        events: [
            ...clicksOn('frame-top', 2, 30),
            ...clicksOn('frame-bottom', 2, 40),
            ...clicksOn('frame-middle', 2, 50),
        ],
    });

    // Second board: one frame has no bounds at all, so canonical order can't
    // be determined -> the signal should be skipped entirely for this test,
    // even though the visit order below would otherwise look backward.
    const missingBoundsBoard = await Board.create({
        miroId: 'no-bounds-board',
        name: 'No Bounds Board',
        elements: [
            { miroId: 'frame-a', type: 'frame', content: 'A', bounds: { x: 0, y: 0, width: 100, height: 100 } },
            { miroId: 'frame-b', type: 'frame', content: 'B' },
        ],
    });
    const missingBoundsTest = await Test.create({
        name: 'No Bounds Test',
        board: missingBoundsBoard._id,
        researcher: authBody.user.id,
    });
    missingBoundsTestId = missingBoundsTest._id.toString();

    await Session.create({
        test: missingBoundsTest._id,
        status: 'completed',
        events: [
            ...clicksOn('frame-b', 2, 0),
            ...clicksOn('frame-a', 2, 10),
            ...clicksOn('frame-b', 2, 20),
        ],
    });
});

after(async () => {
    await server.stop();
});

test('a section revisited out of the board\'s spatial reading order is flagged repeated_navigation', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${orderedTestId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    const middle = body.sections.find((s) => s.frameId === 'frame-middle');
    assert.equal(middle.backtrackCount, 1);
    assert.equal(middle.outcome, 'repeated_navigation');
    assert.match(middle.explanation, /layout order|reading order|back/i);
});

test('sections visited in canonical order are not flagged', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${orderedTestId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();

    const top = body.sections.find((s) => s.frameId === 'frame-top');
    const bottom = body.sections.find((s) => s.frameId === 'frame-bottom');
    assert.equal(top.backtrackCount, 0);
    assert.equal(bottom.backtrackCount, 0);
    assert.notEqual(top.outcome, 'repeated_navigation');
    assert.notEqual(bottom.outcome, 'repeated_navigation');
});

test('a section missing board position data never gets a reading-order backtrack guessed', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${missingBoundsTestId}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();

    const a = body.sections.find((s) => s.frameId === 'frame-a');
    const b = body.sections.find((s) => s.frameId === 'frame-b');
    assert.equal(a.backtrackCount, 0);
    assert.equal(b.backtrackCount, 0);
});
