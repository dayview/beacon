import Session from '../models/Session.js';
import Heatmap from '../models/Heatmap.js';

/**
 * Generate heatmap data from session events for a given test.
 *
 * Aggregates click/hover/scroll events from all sessions of a test
 * and produces intensity-mapped data points.
 *
 * @param {string} testId - The test ObjectId
 * @param {string} boardId - The board ObjectId
 * @param {string} type - 'click' | 'attention' | 'scroll'
 * @returns {Object} Heatmap document
 */
export async function generateHeatmap(testId, boardId, type = 'click') {
    // Map heatmap type to event type(s)
    const eventTypeMap = {
        click: ['click'],
        attention: ['hover', 'click'],
        scroll: ['scroll'],
    };
    const eventTypes = eventTypeMap[type] || ['click'];

    // Fetch all sessions for this test
    const sessions = await Session.find({ test: testId }).lean();

    // Aggregate events into coordinate buckets
    const bucketSize = 20; // px — grid resolution for grouping nearby points
    const buckets = new Map();

    for (const session of sessions) {
        for (const event of session.events || []) {
            if (!eventTypes.includes(event.type)) continue;
            if (!event.coordinates) continue;

            const bx = Math.floor(event.coordinates.x / bucketSize) * bucketSize;
            const by = Math.floor(event.coordinates.y / bucketSize) * bucketSize;
            const key = `${bx}:${by}`;

            buckets.set(key, (buckets.get(key) || 0) + 1);
        }
    }

    // Convert buckets to data points with normalized intensity
    const maxCount = Math.max(...buckets.values(), 1);
    const data = [];
    for (const [key, count] of buckets) {
        const [x, y] = key.split(':').map(Number);
        data.push({
            x,
            y,
            intensity: Math.round((count / maxCount) * 100) / 100,
        });
    }

    // Sort by intensity descending
    data.sort((a, b) => b.intensity - a.intensity);

    // Upsert heatmap
    const heatmap = await Heatmap.findOneAndUpdate(
        { test: testId, board: boardId, type },
        { data, generatedAt: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return heatmap;
}
