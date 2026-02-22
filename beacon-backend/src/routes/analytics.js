import { Router } from 'express';
import Session from '../models/Session.js';
import Board from '../models/Board.js';
import auth from '../middleware/auth.js';
import { authorizeTestOwner } from '../middleware/authorize.js';
import { objectIdParam, validate } from '../middleware/validation.js';
import { detectConfusionZones, getDwellTimeSummary } from '../services/confusionService.js';
import { computeNavigationPaths, computeScrollDepth } from '../services/flowService.js';

const router = Router();

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
            const sessions = await Session.find({ test: req.params.testId })
                .select('events')
                .lean();

            // Aggregate interactions per element
            const elementStats = new Map();

            for (const session of sessions) {
                for (const event of session.events || []) {
                    const el = event.element || 'unknown';
                    if (!elementStats.has(el)) {
                        elementStats.set(el, {
                            element: el,
                            clicks: 0,
                            hovers: 0,
                            scrolls: 0,
                            taskCompletes: 0,
                            totalInteractions: 0,
                            sessions: new Set(),
                        });
                    }
                    const stats = elementStats.get(el);
                    stats.totalInteractions++;
                    stats.sessions.add(session._id.toString());
                    if (event.type === 'click') stats.clicks++;
                    else if (event.type === 'hover') stats.hovers++;
                    else if (event.type === 'scroll') stats.scrolls++;
                    else if (event.type === 'task_complete') stats.taskCompletes++;
                }
            }

            // Convert to array and resolve session count
            const elements = Array.from(elementStats.values())
                .map((s) => ({
                    element: s.element,
                    clicks: s.clicks,
                    hovers: s.hovers,
                    scrolls: s.scrolls,
                    taskCompletes: s.taskCompletes,
                    totalInteractions: s.totalInteractions,
                    sessionCount: s.sessions.size,
                }))
                .sort((a, b) => b.totalInteractions - a.totalInteractions);

            res.json({
                testId: req.params.testId,
                totalSessions: sessions.length,
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
            const zones = await detectConfusionZones(req.params.testId);

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
            const summary = await getDwellTimeSummary(req.params.testId);

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

            const depth = await computeScrollDepth(req.params.testId, { bucketSize });

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
            const [confusionZones, dwellTimes, flow, scrollDepth, sessions] =
                await Promise.all([
                    detectConfusionZones(testId),
                    getDwellTimeSummary(testId),
                    computeNavigationPaths(testId, { topN: 5 }),
                    computeScrollDepth(testId),
                    Session.countDocuments({ test: testId }),
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

export default router;
