import Session from '../models/Session.js';

/**
 * Confusion Detection Service
 *
 * Analyzes dwell-time patterns and interaction anomalies to identify
 * areas of a Miro board where viewers are getting confused.
 */

// Thresholds (configurable)
const DWELL_THRESHOLD_MS = 8000;   // Hovering > 8s on one element = potential confusion
const RAPID_CLICK_WINDOW_MS = 2000; // Multiple clicks within 2s = frustration
const RAPID_CLICK_MIN = 3;          // Minimum clicks in window to flag

/**
 * Analyze sessions for a test and identify confusion zones.
 *
 * Returns an array of confusion zones, each with:
 *   - element: the Miro element ID
 *   - type: 'dwell' | 'rage_click' | 'backtrack'
 *   - severity: 0–1 normalized
 *   - details: human-readable explanation
 *   - coordinates: { x, y } center of the zone
 *   - affectedSessions: count of sessions that exhibited this pattern
 *
 * @param {string} testId
 * @returns {Array} confusion zones
 */
export async function detectConfusionZones(testId) {
    const sessions = await Session.find({ test: testId }).lean();

    const dwellMap = new Map();       // element → [{ duration, sessionId }]
    const clickSequences = new Map(); // sessionId → [{ element, timestamp, coordinates }]

    for (const session of sessions) {
        const events = session.events || [];

        // ── 1. Dwell-time analysis (hover duration per element) ───
        let lastHoverElement = null;
        let hoverStart = null;

        for (const event of events) {
            if (event.type === 'hover' && event.element) {
                if (event.element !== lastHoverElement) {
                    // Close previous hover
                    if (lastHoverElement && hoverStart) {
                        const duration = new Date(event.timestamp) - new Date(hoverStart);
                        if (!dwellMap.has(lastHoverElement)) dwellMap.set(lastHoverElement, []);
                        dwellMap.get(lastHoverElement).push({
                            duration,
                            sessionId: session._id,
                            coordinates: event.coordinates,
                        });
                    }
                    lastHoverElement = event.element;
                    hoverStart = event.timestamp;
                }
            }

            // ── 2. Build click sequences for rage-click detection ───
            if (event.type === 'click') {
                if (!clickSequences.has(session._id.toString())) {
                    clickSequences.set(session._id.toString(), []);
                }
                clickSequences.get(session._id.toString()).push({
                    element: event.element,
                    timestamp: new Date(event.timestamp),
                    coordinates: event.coordinates || { x: 0, y: 0 },
                });
            }
        }

        // Close final hover
        if (lastHoverElement && hoverStart && events.length > 0) {
            const lastEvent = events[events.length - 1];
            const duration = new Date(lastEvent.timestamp) - new Date(hoverStart);
            if (!dwellMap.has(lastHoverElement)) dwellMap.set(lastHoverElement, []);
            dwellMap.get(lastHoverElement).push({
                duration,
                sessionId: session._id,
                coordinates: lastEvent.coordinates,
            });
        }
    }

    const confusionZones = [];

    // ── Process dwell-time results ─────────────────────────────
    for (const [element, dwells] of dwellMap) {
        const longDwells = dwells.filter((d) => d.duration >= DWELL_THRESHOLD_MS);
        if (longDwells.length === 0) continue;

        const avgDwell = longDwells.reduce((sum, d) => sum + d.duration, 0) / longDwells.length;
        const severity = Math.min(avgDwell / (DWELL_THRESHOLD_MS * 5), 1); // normalize

        // Use the coordinates from the most representative dwell
        const representativeCoords = longDwells[0]?.coordinates || { x: 0, y: 0 };

        confusionZones.push({
            element,
            type: 'dwell',
            severity: Math.round(severity * 100) / 100,
            details: `${longDwells.length} of ${sessions.length} viewers lingered for avg ${Math.round(avgDwell / 1000)}s — indicating potential confusion or difficulty understanding this area.`,
            coordinates: representativeCoords,
            affectedSessions: longDwells.length,
            avgDwellTimeMs: Math.round(avgDwell),
        });
    }

    // ── Process rage-click results ─────────────────────────────
    const rageClickElements = new Map(); // element → count of sessions with rage clicks

    for (const [sessionId, clicks] of clickSequences) {
        // Sort clicks by timestamp
        clicks.sort((a, b) => a.timestamp - b.timestamp);

        for (let i = 0; i < clicks.length - RAPID_CLICK_MIN + 1; i++) {
            const window = clicks.slice(i, i + RAPID_CLICK_MIN);
            const timeSpan = window[window.length - 1].timestamp - window[0].timestamp;

            if (timeSpan <= RAPID_CLICK_WINDOW_MS) {
                // Check if they're on the same element or nearby coordinates
                const targetElement = window[0].element || 'unknown';
                if (!rageClickElements.has(targetElement)) {
                    rageClickElements.set(targetElement, {
                        count: 0,
                        coordinates: window[0].coordinates,
                    });
                }
                rageClickElements.get(targetElement).count++;
                break; // Only count once per session
            }
        }
    }

    for (const [element, data] of rageClickElements) {
        const severity = Math.min(data.count / sessions.length, 1);
        confusionZones.push({
            element,
            type: 'rage_click',
            severity: Math.round(severity * 100) / 100,
            details: `${data.count} viewers rapidly clicked this area multiple times — suggesting frustration or an unresponsive element.`,
            coordinates: data.coordinates,
            affectedSessions: data.count,
        });
    }

    // Sort by severity descending
    confusionZones.sort((a, b) => b.severity - a.severity);

    return confusionZones;
}

/**
 * Calculate dwell-time summary per element across all sessions of a test.
 *
 * @param {string} testId
 * @returns {Array} [ { element, totalDwellMs, avgDwellMs, sessionCount } ]
 */
export async function getDwellTimeSummary(testId) {
    const sessions = await Session.find({ test: testId }).select('events').lean();

    const elementDwell = new Map();

    for (const session of sessions) {
        const events = session.events || [];
        let lastElement = null;
        let lastTimestamp = null;

        for (const event of events) {
            if ((event.type === 'hover' || event.type === 'click') && event.element) {
                if (lastElement && lastElement !== event.element && lastTimestamp) {
                    const duration = new Date(event.timestamp) - new Date(lastTimestamp);
                    if (duration > 0 && duration < 300000) { // cap at 5 min to ignore idle
                        if (!elementDwell.has(lastElement)) {
                            elementDwell.set(lastElement, { totalMs: 0, count: 0, sessions: new Set() });
                        }
                        const entry = elementDwell.get(lastElement);
                        entry.totalMs += duration;
                        entry.count++;
                        entry.sessions.add(session._id.toString());
                    }
                }
                lastElement = event.element;
                lastTimestamp = event.timestamp;
            }
        }
    }

    return Array.from(elementDwell.entries())
        .map(([element, data]) => ({
            element,
            totalDwellMs: data.totalMs,
            avgDwellMs: Math.round(data.totalMs / data.count),
            sessionCount: data.sessions.size,
        }))
        .sort((a, b) => b.totalDwellMs - a.totalDwellMs);
}
