import { Router } from 'express';
import Session from '../models/Session.js';
import Board from '../models/Board.js';
import auth from '../middleware/auth.js';
import { authorizeTestOwner } from '../middleware/authorize.js';
import { objectIdParam, validate } from '../middleware/validation.js';
import { detectConfusionZones, getDwellTimeSummary } from '../services/confusionService.js';
import { computeNavigationPaths, computeScrollDepth } from '../services/flowService.js';
import {
    computeComparisonMetrics,
    batchSessionCounts
} from '../services/comparisonService.js';
import { generateSectionInsights } from '../services/sectionInsightsService.js';
import { buildSessionQuery } from '../services/analyticsFilters.js';
import {
    computeElementStats,
    computeSessionStats,
    buildEventsCsv,
    buildAnalyticsWorkbook,
} from '../services/exportService.js';

const router = Router();

// Shared analytics filters — every analytics endpoint below reads the same
// three optional query params so LiveAnalytics's one filter bar can drive
// every view: ?sessionId=, ?role=, ?sectionId= (a Miro frame ID).
function parseFilters(req) {
    const { sessionId, role, sectionId } = req.query;
    return {
        sessionId: sessionId || undefined,
        role: role || undefined,
        sectionId: sectionId || undefined,
    };
}

// ── GET /api/analytics/:testId/elements ──────────────────────
// Element-level interaction rollup
router.get(
    '/:testId/elements',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const { totalSessions, elements } = await computeElementStats(req.params.testId, parseFilters(req));

            res.json({
                testId: req.params.testId,
                totalSessions,
                elements,
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Element analytics error:`, error);
            res.status(500).json({ error: 'Failed to compute element analytics.' });
        }
    }
);

// ── GET /api/analytics/:testId/confusion ─────────────────────
// Confusion zone detection
router.get(
    '/:testId/confusion',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const zones = await detectConfusionZones(req.params.testId, parseFilters(req));

            res.json({
                testId: req.params.testId,
                confusionZones: zones,
                totalZones: zones.length,
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Confusion detection error:`, error);
            res.status(500).json({ error: 'Failed to detect confusion zones.' });
        }
    }
);

// ── GET /api/analytics/:testId/dwell ─────────────────────────
// Dwell-time summary per element
router.get(
    '/:testId/dwell',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const summary = await getDwellTimeSummary(req.params.testId, parseFilters(req));

            res.json({
                testId: req.params.testId,
                dwellTimes: summary,
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Dwell time error:`, error);
            res.status(500).json({ error: 'Failed to compute dwell times.' });
        }
    }
);

// ── GET /api/analytics/:testId/sections ──────────────────────
// Per-frame ("section") reach/dwell/backtrack rollup with a
// confidence-scored, explained skipped/skimmed/confusion/interest outcome.
router.get(
    '/:testId/sections',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const insights = await generateSectionInsights(req.params.testId, parseFilters(req));
            res.json(insights);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Section insights error:`, error);
            res.status(500).json({ error: 'Failed to compute section insights.' });
        }
    }
);

// ── GET /api/analytics/:testId/sessions ──────────────────────
// Minimal per-session list (start time, status, reported role) to power
// the session/role filter dropdowns in LiveAnalytics — participants have
// no name, so sessions are identified by when they ran.
router.get(
    '/:testId/sessions',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const sessions = await Session.find({ test: req.params.testId })
                .select('status startedAt participant.demographics.role')
                .sort({ startedAt: -1 })
                .lean();

            res.json({
                sessions: sessions.map((s) => ({
                    id: s._id,
                    startedAt: s.startedAt,
                    status: s.status,
                    role: s.participant?.demographics?.role || null,
                })),
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Session list error:`, error);
            res.status(500).json({ error: 'Failed to fetch session list.' });
        }
    }
);

// ── GET /api/analytics/:testId/flow ──────────────────────────
// Navigation path analysis
router.get(
    '/:testId/flow',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const topN = parseInt(req.query.topN) || 10;
            const maxPathLength = parseInt(req.query.maxPathLength) || 10;

            const flow = await computeNavigationPaths(req.params.testId, {
                topN,
                maxPathLength,
                ...parseFilters(req),
            });

            res.json({
                testId: req.params.testId,
                ...flow,
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Flow analysis error:`, error);
            res.status(500).json({ error: 'Failed to compute navigation paths.' });
        }
    }
);

// ── GET /api/analytics/:testId/scroll-depth ──────────────────
// Scroll depth analysis
router.get(
    '/:testId/scroll-depth',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const bucketSize = parseInt(req.query.bucketSize) || 100;

            const depth = await computeScrollDepth(req.params.testId, { bucketSize, ...parseFilters(req) });

            res.json({
                testId: req.params.testId,
                ...depth,
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Scroll depth error:`, error);
            res.status(500).json({ error: 'Failed to compute scroll depth.' });
        }
    }
);

// ── GET /api/analytics/:testId/summary ───────────────────────
// Combined analytics summary (all metrics in one call)
router.get(
    '/:testId/summary',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const testId = req.params.testId;
            const filters = parseFilters(req);
            const [confusionZones, dwellTimes, flow, scrollDepth, sessions] =
                await Promise.all([
                    detectConfusionZones(testId, filters),
                    getDwellTimeSummary(testId, filters),
                    computeNavigationPaths(testId, { topN: 5, ...filters }),
                    computeScrollDepth(testId, filters),
                    Session.countDocuments(buildSessionQuery(testId, filters)),
                ]);

            res.json({
                testId,
                totalSessions: sessions,
                confusion: {
                    zones: confusionZones.slice(0, 5), // top 5
                    totalZones: confusionZones.length,
                },
                dwellTimes: dwellTimes.slice(0, 10), // top 10 elements
                flow: {
                    topPaths: flow.paths,
                    dropoffPoints: flow.dropoffPoints.slice(0, 5),
                },
                scrollDepth: {
                    avgMaxDepth: scrollDepth.avgMaxDepth,
                    dropoffPoint: scrollDepth.dropoffPoint,
                    percentiles: scrollDepth.percentiles,
                },
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Analytics summary error:`, error);
            res.status(500).json({ error: 'Failed to generate analytics summary.' });
        }
    }
);

// ── GET /api/analytics/:testId/session-stats ─────────────────
// Real session-level statistics (avg duration, completion rate)
router.get(
    '/:testId/session-stats',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const testId = req.params.testId;
            const { totalSessions, completedSessions, completionRate, avgDuration } = await computeSessionStats(testId);

            res.json({
                testId,
                totalSessions,
                completedSessions,
                completionRate,
                avgDuration,
                minSampleSize: req.test.settings.minSampleSize,
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Session stats error:`, error);
            res.status(500).json({ error: 'Failed to compute session stats.' });
        }
    }
);

// ── GET /api/analytics/:testId/compare ─────────────────────
// All comparison metrics for a single test (real data)
router.get(
    '/:testId/compare',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const metrics = await computeComparisonMetrics(
                req.params.testId
            );
            res.json({ testId: req.params.testId, metrics });
        } catch (error) {
            console.error(
                `[${new Date().toISOString()}] Compare metrics error:`,
                error
            );
            res.status(500).json({
                error: 'Failed to compute comparison metrics.'
            });
        }
    }
);

// ── GET /api/analytics/:testId/export/events.csv ─────────────
// Raw per-event rows (one row per click/hover/scroll/task_complete)
router.get(
    '/:testId/export/events.csv',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const csv = await buildEventsCsv(req.params.testId);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="beacon-events-${req.params.testId}.csv"`
            );
            res.send(csv);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Events export error:`, error);
            res.status(500).json({ error: 'Failed to export raw events.' });
        }
    }
);

// ── GET /api/analytics/:testId/export/analytics.xlsx ─────────
// Aggregated analytics as a multi-sheet workbook (elements, confusion,
// dwell times, sections, flow, scroll depth, session stats).
router.get(
    '/:testId/export/analytics.xlsx',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const buffer = await buildAnalyticsWorkbook(req.params.testId);
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="beacon-analytics-${req.params.testId}.xlsx"`
            );
            res.send(buffer);
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Analytics export error:`, error);
            res.status(500).json({ error: 'Failed to export analytics.' });
        }
    }
);

// ── POST /api/analytics/batch-sessions ─────────────────────
// Returns { testId: sessionCount } for multiple tests at once.
// Used by TestContext to populate test.analytics.totalSessions.
router.post(
    '/batch-sessions',
    auth,
    async (req, res) => {
        try {
            const { testIds } = req.body;
            if (!Array.isArray(testIds) || testIds.length === 0) {
                return res.json({ counts: {} });
            }
            // Limit to 50 to prevent abuse
            const safeIds = testIds.slice(0, 50);
            const counts = await batchSessionCounts(safeIds);
            res.json({ counts });
        } catch (error) {
            console.error(
                `[${new Date().toISOString()}] Batch sessions error:`,
                error
            );
            res.status(500).json({
                error: 'Failed to fetch session counts.'
            });
        }
    }
);

export default router;
