import { Router } from 'express';
import Session from '../models/Session.js';
import Test from '../models/Test.js';
import AIInsight from '../models/AIInsight.js';
import auth from '../middleware/auth.js';
import { checkAIQuota } from '../middleware/planLimits.js';
import { objectIdParam, validate } from '../middleware/validation.js';
import { analyzeSession } from '../services/aiService.js';

const router = Router();

// ── POST /api/ai/analyze/:sessionId ──────────────────────────
router.post(
    '/analyze/:sessionId',
    auth,
    objectIdParam('sessionId'),
    validate,
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
