import mongoose from 'mongoose';
import crypto from 'crypto';
import { httpServer } from '../../src/server.js';

// Deliberately a different env var name from the real app's MONGODB_URI —
// tests must never be able to accidentally touch a real database just
// because a real .env happens to be present (see server.js's isMainModule
// guard for the other half of this safety net).
const BASE_TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/beacon_test';

// Node's test runner runs test files concurrently by default. Every file
// calls startTestServer() independently, so each one gets its own uniquely
// suffixed database on the same Mongo server — otherwise concurrent files
// would race on the same physical database (one file's unscoped count
// picking up another's data, two after() hooks both dropping the same DB).
function uniqueTestDatabaseUri() {
    const url = new URL(BASE_TEST_MONGODB_URI);
    const suffix = crypto.randomBytes(4).toString('hex');
    url.pathname = `${url.pathname.replace(/\/$/, '')}_${suffix}`;
    return url.toString();
}

/**
 * Connects to a fresh, uniquely-named test database and starts the real
 * Express app (imported from server.js, same routes/middleware/socket.io
 * wiring as production) on an ephemeral port. Call `stop()` when the test
 * file is done.
 */
export async function startTestServer() {
    await mongoose.connect(uniqueTestDatabaseUri());

    await new Promise((resolve, reject) => {
        httpServer.listen(0, resolve);
        httpServer.once('error', reject);
    });
    const { port } = httpServer.address();

    return {
        baseUrl: `http://127.0.0.1:${port}`,
        async stop() {
            await new Promise((resolve) => httpServer.close(resolve));
            await mongoose.connection.dropDatabase();
            await mongoose.connection.close();
        },
    };
}

/** Wipes every collection — call between tests that seed conflicting data. */
export async function clearDatabase() {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
}
