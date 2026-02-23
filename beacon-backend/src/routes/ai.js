import { Router } from 'express';
import Session from '../models/Session.js';
import Test from '../models/Test.js';
import AIInsight from '../models/AIInsight.js';
import auth from '../middleware/auth.js';
import { authorizeSessionOwner, authorizeTestOwner } from '../middleware/authorize.js';
import { checkAIQuota } from '../middleware/planLimits.js';
import { objectIdParam, validate } from '../middleware/validation.js';
import { analyzeSession } from '../services/aiService.js';

const router = Router();

// ── POST /api/ai/analyze/:testId (test-level) ───────────────
router.post(
    '/analyze/:testId',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    checkAIQuota,
    async (req, res) => {
        try {
            const test = await Test.findById(req.params.testId);
            if (!test) {
                return res.status(404).json({ error: 'Test not found.' });
            }

            // Find the latest completed session for this test
            const session = await Session.findOne({ test: test._id })
                .sort({ completedAt: -1, startedAt: -1 });

            if (!session) {
                return res.status(404).json({ error: 'No sessions found for this test. Run a test session first.' });
            }

            const { provider } = req.body;
            const insight = await analyzeSession(session, test, req.user, provider);

            res.json({ insight });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AI analyze-test error:`, error);
            res.status(500).json({ error: error.message || 'AI analysis failed.' });
        }
    }
);

// ── POST /api/ai/analyze/session/:sessionId ──────────────────
router.post(
    '/analyze/session/:sessionId',
    auth,
    objectIdParam('sessionId'),
    validate,
    authorizeSessionOwner('sessionId'),
    checkAIQuota,
    async (req, res) => {
        try {
            const session = await Session.findById(req.params.sessionId);
            if (!session) {
                return res.status(404).json({ error: 'Session not found.' });
            }

            const test = await Test.findById(session.test);
            if (!test) {
                return res.status(404).json({ error: 'Associated test not found.' });
            }

            const { provider } = req.body; // optional override
            const insight = await analyzeSession(session, test, req.user, provider);

            res.json({ insights: insight });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AI analyze error:`, error);
            res.status(500).json({ error: error.message || 'AI analysis failed.' });
        }
    }
);

// ── GET /api/ai/insights/:testId ─────────────────────────────
router.get(
    '/insights/:testId',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const insights = await AIInsight.find({ test: req.params.testId })
                .populate('session', 'startedAt completedAt status')
                .sort({ generatedAt: -1 });

            res.json({ insights });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AI insights error:`, error);
            res.status(500).json({ error: 'Failed to fetch insights.' });
        }
    }
);

export default router;
