import Session from '../models/Session.js';
import Test from '../models/Test.js';
import { detectConfusionZones } from './confusionService.js';

/**
 * Compute all comparison metrics for a single test.
 * Returns a ComparisonMetrics object.
 *
 * @param {string} testId
 * @returns {Promise<ComparisonMetrics>}
 */
export async function computeComparisonMetrics(testId) {
    const [sessions, test, confusionZones] = await Promise.all([
        Session.find({ test: testId })
            .select('events status startedAt completedAt metrics')
            .lean(),
        Test.findById(testId).select('tasks').lean(),
        detectConfusionZones(testId),
    ]);

    const totalSessions = sessions.length;

    // ── Total Clicks ─────────────────────────────────────────
    const totalClicks = sessions.reduce((sum, s) =>
        sum + (s.events || []).filter(e => e.type === 'click').length, 0
    );

    // ── Average Duration (seconds) ────────────────────────────
    const timedSessions = sessions.filter(
        s => s.completedAt && s.startedAt
    );
    const avgDuration = timedSessions.length > 0
        ? timedSessions.reduce((sum, s) =>
            sum + (new Date(s.completedAt) - new Date(s.startedAt)), 0
        ) / timedSessions.length / 1000
        : 0;

    // ── Completion Rate (%) ───────────────────────────────────
    const completedCount = sessions.filter(
        s => s.status === 'completed'
    ).length;
    const completionRate = totalSessions > 0
        ? Math.round((completedCount / totalSessions) * 100)
        : 0;

    // ── First-Click Accuracy (%) ──────────────────────────────
    // Definition:
    //   If test has tasks with targetElement defined:
    //     % of sessions where the first click.element matches 
    //     any task.targetElement
    //   Fallback (no targets defined):
    //     % of sessions where the first click.element is a 
    //     named element (non-null, non-empty, not 'unknown')
    //     — indicates the board has clear interactive affordances
    const targetElements = (test?.tasks || [])
        .map(t => t.targetElement)
        .filter(v => v && v.trim() !== '');

    let firstClickMeasured = 0;
    let firstClickAccurate = 0;
    const hasTargets = targetElements.length > 0;

    for (const session of sessions) {
        const firstClick = (session.events || []).find(
            e => e.type === 'click'
        );
        if (!firstClick) continue;
        firstClickMeasured++;

        if (hasTargets) {
            if (targetElements.includes(firstClick.element)) {
                firstClickAccurate++;
            }
        } else {
            const el = firstClick.element;
            if (el && el !== 'unknown' && el.trim() !== '') {
                firstClickAccurate++;
            }
        }
    }

    const firstClickAccuracy = firstClickMeasured > 0
        ? Math.round((firstClickAccurate / firstClickMeasured) * 100)
        : null; // null means insufficient data

    const firstClickIsEstimated = !hasTargets;

    // ── Dead Zones (from confusionService) ────────────────────
    // A "dead zone" is any confusion zone of type dwell or rage_click
    const deadZones = confusionZones.filter(
        z => z.type === 'dwell' || z.type === 'rage_click'
    );
    const deadZonesCount = deadZones.length;
    const deadZoneElements = deadZones
        .slice(0, 3)
        .map(z => z.element);

    return {
        totalSessions,
        totalClicks,
        avgDuration: Math.round(avgDuration),
        completionRate,
        firstClickAccuracy,
        firstClickIsEstimated,
        deadZonesCount,
        deadZoneElements,
    };
}

/**
 * Return session counts for an array of testIds in one DB call.
 * Used by TestContext to determine which tests have data.
 *
 * @param {string[]} testIds
 * @returns {Promise<Record<string, number>>}  { testId: sessionCount }
 */
export async function batchSessionCounts(testIds) {
    if (!testIds || testIds.length === 0) return {};

    // Use countDocuments per testId in parallel
    const counts = await Promise.all(
        testIds.map(async id => ({
            testId: id,
            count: await Session.countDocuments({ test: id }),
        }))
    );

    return Object.fromEntries(counts.map(c => [c.testId, c.count]));
}
