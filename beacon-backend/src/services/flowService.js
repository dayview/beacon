import Session from '../models/Session.js';

/**
 * Flow Analysis Service
 *
 * Computes navigation paths (element-to-element transitions) and
 * scroll depth metrics from session event data.
 */

/**
 * Compute navigation paths across all sessions for a test.
 *
 * Returns:
 *   - paths: top N most-common element transition sequences
 *   - transitions: edge list with counts (from → to → count)
 *   - dropoffPoints: elements where viewers most commonly stopped
 *
 * @param {string} testId
 * @param {Object} options
 * @param {number} options.maxPathLength - Max number of elements in a path (default: 10)
 * @param {number} options.topN - Number of top paths to return (default: 10)
 * @returns {Object}
 */
export async function computeNavigationPaths(testId, { maxPathLength = 10, topN = 10 } = {}) {
    const sessions = await Session.find({ test: testId }).select('events status').lean();

    const pathCounts = new Map();   // serialized path → count
    const transitions = new Map();  // "from→to" → count
    const dropoffs = new Map();     // element → count (last element in abandoned/completed sessions)
    const elementVisits = new Map(); // element → total visit count

    for (const session of sessions) {
        const events = session.events || [];

        // Extract ordered element sequence (deduped consecutive)
        const elementSequence = [];
        let lastElement = null;

        for (const event of events) {
            if (event.element && event.element !== lastElement) {
                elementSequence.push(event.element);
                lastElement = event.element;

                // Count total visits
                elementVisits.set(event.element, (elementVisits.get(event.element) || 0) + 1);
            }
        }

        if (elementSequence.length === 0) continue;

        // Record the path (truncated to maxPathLength)
        const path = elementSequence.slice(0, maxPathLength);
        const pathKey = path.join(' → ');
        pathCounts.set(pathKey, (pathCounts.get(pathKey) || 0) + 1);

        // Record transitions (edges)
        for (let i = 0; i < elementSequence.length - 1; i++) {
            const edge = `${elementSequence[i]}→${elementSequence[i + 1]}`;
            transitions.set(edge, (transitions.get(edge) || 0) + 1);
        }

        // Record dropoff point (last element in session)
        const lastEl = elementSequence[elementSequence.length - 1];
        dropoffs.set(lastEl, (dropoffs.get(lastEl) || 0) + 1);
    }

    // Sort paths by frequency
    const sortedPaths = Array.from(pathCounts.entries())
        .map(([path, count]) => ({
            path: path.split(' → '),
            count,
            percentage: Math.round((count / sessions.length) * 100),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);

    // Sort transitions by frequency
    const sortedTransitions = Array.from(transitions.entries())
        .map(([edge, count]) => {
            const [from, to] = edge.split('→');
            return { from, to, count };
        })
        .sort((a, b) => b.count - a.count);

    // Sort dropoffs
    const sortedDropoffs = Array.from(dropoffs.entries())
        .map(([element, count]) => ({
            element,
            count,
            percentage: Math.round((count / sessions.length) * 100),
        }))
        .sort((a, b) => b.count - a.count);

    // Element visit ranking
    const sortedVisits = Array.from(elementVisits.entries())
        .map(([element, count]) => ({ element, visits: count }))
        .sort((a, b) => b.visits - a.visits);

    return {
        totalSessions: sessions.length,
        paths: sortedPaths,
        transitions: sortedTransitions,
        dropoffPoints: sortedDropoffs,
        elementVisits: sortedVisits,
    };
}

/**
 * Calculate scroll depth metrics for a test.
 *
 * Analyzes scroll events to determine how far viewers scroll on the board,
 * identifying the point at which most viewers stop scrolling.
 *
 * @param {string} testId
 * @param {Object} options
 * @param {number} options.bucketSize - Y-coordinate bucket size in px (default: 100)
 * @returns {Object}
 */
export async function computeScrollDepth(testId, { bucketSize = 100 } = {}) {
    const sessions = await Session.find({ test: testId }).select('events').lean();

    const maxYPerSession = []; // max Y coordinate reached per session
    const yBuckets = new Map(); // y-bucket → number of sessions that reached it

    for (const session of sessions) {
        const events = session.events || [];
        let maxY = 0;
        const visitedBuckets = new Set();

        for (const event of events) {
            if (!event.coordinates) continue;
            const y = event.coordinates.y || 0;
            if (y > maxY) maxY = y;

            const bucket = Math.floor(y / bucketSize) * bucketSize;
            visitedBuckets.add(bucket);
        }

        maxYPerSession.push(maxY);

        for (const bucket of visitedBuckets) {
            yBuckets.set(bucket, (yBuckets.get(bucket) || 0) + 1);
        }
    }

    if (maxYPerSession.length === 0) {
        return { totalSessions: 0, avgMaxDepth: 0, depthDistribution: [], dropoffPoint: 0 };
    }

    // Sort buckets by Y position
    const sortedBuckets = Array.from(yBuckets.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([y, count]) => ({
            y,
            sessionsReached: count,
            percentage: Math.round((count / sessions.length) * 100),
        }));

    // Calculate averages
    const avgMaxDepth = Math.round(
        maxYPerSession.reduce((sum, y) => sum + y, 0) / maxYPerSession.length
    );

    // Find dropoff point (first bucket where < 50% of sessions reached)
    const dropoffBucket = sortedBuckets.find((b) => b.percentage < 50);
    const dropoffPoint = dropoffBucket ? dropoffBucket.y : sortedBuckets[sortedBuckets.length - 1]?.y || 0;

    // Percentiles
    const sorted = [...maxYPerSession].sort((a, b) => a - b);
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];

    return {
        totalSessions: sessions.length,
        avgMaxDepth,
        percentiles: { p25, p50, p75 },
        dropoffPoint,
        depthDistribution: sortedBuckets,
    };
}
