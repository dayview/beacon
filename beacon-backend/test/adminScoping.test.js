import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, clearDatabase } from './helpers/testServer.js';
import Test from '../src/models/Test.js';
import Board from '../src/models/Board.js';
import Session from '../src/models/Session.js';
import Heatmap from '../src/models/Heatmap.js';
import AIInsight from '../src/models/AIInsight.js';

let server;

before(async () => {
    server = await startTestServer();
});

after(async () => {
    await server.stop();
});

beforeEach(async () => {
    await clearDatabase();
});

async function provisionUser() {
    const res = await fetch(`${server.baseUrl}/api/auth/start`, { method: 'POST' });
    const { token, user } = await res.json();
    return { token, id: user.id };
}

async function seedTestDataFor(userId, label) {
    const board = await Board.create({ miroId: `board-${label}`, name: `Board ${label}` });
    const t = await Test.create({
        name: `Seed Test ${label}`,
        board: board._id,
        researcher: userId,
        isTestData: true,
    });
    await Session.create({ test: t._id, isTestData: true });
    await Heatmap.create({ test: t._id, board: board._id, type: 'click', data: [], isTestData: true });
    await AIInsight.create({
        test: t._id,
        provider: 'openai',
        insights: { summary: 's', patterns: [], recommendations: [], sentiment: 'neutral', confusionZones: [] },
        isTestData: true,
    });
    return t._id;
}

test('reset-test-data only deletes the calling user\'s own isTestData records', async () => {
    const userA = await provisionUser();
    const userB = await provisionUser();
    await seedTestDataFor(userA.id, 'A');
    await seedTestDataFor(userB.id, 'B');

    const res = await fetch(`${server.baseUrl}/api/admin/reset-test-data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userA.token}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.deleted, { tests: 1, sessions: 1, heatmaps: 1, insights: 1 });

    const remainingTests = await Test.find({}).select('name researcher').lean();
    assert.equal(remainingTests.length, 1);
    assert.equal(remainingTests[0].name, 'Seed Test B');
    assert.equal(String(remainingTests[0].researcher), userB.id);

    assert.equal(await Session.countDocuments({}), 1);
    assert.equal(await Heatmap.countDocuments({}), 1);
    assert.equal(await AIInsight.countDocuments({}), 1);
});

test('re-running reset-test-data for the same user is a no-op once their data is gone', async () => {
    const userA = await provisionUser();
    await seedTestDataFor(userA.id, 'A');

    await fetch(`${server.baseUrl}/api/admin/reset-test-data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userA.token}` },
    });

    const second = await fetch(`${server.baseUrl}/api/admin/reset-test-data`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${userA.token}` },
    });
    const body = await second.json();
    assert.deepEqual(body.deleted, { tests: 0, sessions: 0, heatmaps: 0, insights: 0 });
});

test('reset-test-data requires authentication', async () => {
    const res = await fetch(`${server.baseUrl}/api/admin/reset-test-data`, { method: 'DELETE' });
    assert.equal(res.status, 401);
});
