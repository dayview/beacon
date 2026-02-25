import { Router } from 'express';
import Test from '../models/Test.js';
import Heatmap from '../models/Heatmap.js';
import auth from '../middleware/auth.js';
import { predictBehavior } from '../services/aiService.js';
import { objectIdParam, validate } from '../middleware/validation.js';
import { authorizeTestOwner } from '../middleware/authorize.js';
import { checkAIQuota } from '../middleware/planLimits.js';

const router = Router();

// ── POST /api/ai/predict/:testId ─────────────────────────────
router.post(
    '/predict/:testId',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    checkAIQuota,
    async (req, res) => {
        try {
            const { predictions, summary } = await predictBehavior(req.test, req.user);

            // Stored heatmap only has x, y, intensity
            const heatmapData = predictions.map(p => ({
                x: p.x,
                y: p.y,
                intensity: p.intensity
            }));

            const heatmap = await Heatmap.findOneAndUpdate(
                { test: req.test._id, type: 'predictive' },
                {
                    $set: {
                        board: req.test.board,
                        data: heatmapData
                    }
                },
                { upsert: true, new: true }
            );

            res.json({
                predictions,
                summary,
                heatmap
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AI predict error:`, error);
            res.status(error.status || 500).json({ error: error.message || 'Failed to generate predictions.' });
        }
    }
);

// ── GET /api/ai/predict/:testId ──────────────────────────────
router.get(
    '/predict/:testId',
    auth,
    objectIdParam('testId'),
    validate,
    authorizeTestOwner('testId'),
    async (req, res) => {
        try {
            const heatmap = await Heatmap.findOne({ test: req.test._id, type: 'predictive' });
            res.json({ heatmap }); // returns null if not found, which is fine
        } catch (error) {
            console.error(`[${new Date().toISOString()}] AI fetch predict error:`, error);
            res.status(500).json({ error: 'Failed to fetch predictive heatmap.' });
        }
    }
);

export default router;
