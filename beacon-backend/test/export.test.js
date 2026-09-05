import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { startTestServer } from './helpers/testServer.js';
import User from '../src/models/User.js';
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

    const board = await Board.create({ miroId: 'export-board', name: 'Export Board' });
    const t = await Test.create({ name: 'Export Test', board: board._id, researcher: authBody.user.id });
    testId = t._id.toString();

    await Session.create({
        test: t._id,
        status: 'completed',
        events: [
            {
                type: 'click',
                frameId: 'frame-1',
                element: 'Button, "Submit"', // deliberately needs CSV escaping
                coordinates: { x: 10, y: 20 },
                metadata: { note: 'a "quoted" value' },
            },
            { type: 'hover', frameId: 'frame-1', element: 'Sidebar', coordinates: { x: 5, y: 5 } },
        ],
    });
});

after(async () => {
    await server.stop();
});

test('events.csv export returns a header row plus one row per event, correctly escaped', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/export/events.csv`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/csv/);

    const csv = await res.text();
    const lines = csv.trim().split('\n');
    assert.equal(lines[0], 'sessionId,participantId,sessionStatus,eventType,timestamp,x,y,element,frameId,metadata');
    assert.equal(lines.length, 3); // header + 2 events
    assert.match(lines[1], /"Button, ""Submit"""/); // comma+quotes escaped per RFC 4180
});

test('analytics.xlsx export returns a valid multi-sheet workbook', async () => {
    const res = await fetch(`${server.baseUrl}/api/analytics/${testId}/export/analytics.xlsx`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    assert.match(
        res.headers.get('content-type'),
        /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/
    );

    const buffer = Buffer.from(await res.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheetNames = workbook.worksheets.map((s) => s.name);
    assert.deepEqual(sheetNames, [
        'Summary', 'Elements', 'Confusion', 'Dwell Times',
        'Sections', 'Flow - Top Paths', 'Flow - Dropoffs', 'Scroll Depth',
    ]);

    const elementsSheet = workbook.getWorksheet('Elements');
    // header row + at least one data row for the events seeded above
    assert.ok(elementsSheet.rowCount >= 2);
});

test('export endpoints require authentication', async () => {
    const csvRes = await fetch(`${server.baseUrl}/api/analytics/${testId}/export/events.csv`);
    assert.equal(csvRes.status, 401);
    const xlsxRes = await fetch(`${server.baseUrl}/api/analytics/${testId}/export/analytics.xlsx`);
    assert.equal(xlsxRes.status, 401);
});
