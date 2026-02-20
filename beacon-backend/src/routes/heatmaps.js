import { Router } from 'express';
import Heatmap from '../models/Heatmap.js';
import Test from '../models/Test.js';
import auth from '../middleware/auth.js';
import { objectIdParam, validate } from '../middleware/validation.js';
import { generateHeatmap } from '../services/heatmapService.js';

const router = Router();

// ── POST /api/heatmaps/generate/:testId ──────────────────────
// Generate (or regenerate) a heatmap for a test
router.post(
    '/generate/:testId',
    auth,
    objectIdParam('testId'),
    validate,
    async (req, res) => {
        try {
            const test = await Test.findById(req.params.testId);
            if (!test) {
                return res.status(404).json({ error: 'Test not found.' });
            }

            const type = req.body.type || 'click'; // 'click' | 'attention' | 'scroll'
            if (!['click', 'attention', 'scroll'].includes(type)) {
                return res.status(400).json({ error: 'Invalid heatmap type. Use: click, attention, or scroll.' });
            }

            const heatmap = await generateHeatmap(
                req.params.testId,
                test.board,
                type
            );

            res.json({ heatmap });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Heatmap generate error:`, error);
            res.status(500).json({ error: 'Failed to generate heatmap.' });
        }
    }
);

// ── GET /api/heatmaps/:testId ────────────────────────────────
// Get all heatmaps for a test
router.get(
    '/:testId',
    auth,
    objectIdParam('testId'),
    validate,
    async (req, res) => {
        try {
            const filter = { test: req.params.testId };
            if (req.query.type) {
                filter.type = req.query.type;
            }

            const heatmaps = await Heatmap.find(filter).sort({ generatedAt: -1 });

            res.json({ heatmaps });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Heatmap list error:`, error);
            res.status(500).json({ error: 'Failed to fetch heatmaps.' });
        }
    }
);

// ── GET /api/heatmaps/:testId/:type ──────────────────────────
// Get a specific heatmap type for a test
router.get(
    '/:testId/:type',
    auth,
    objectIdParam('testId'),
    validate,
    async (req, res) => {
        try {
            const { testId, type } = req.params;

            if (!['click', 'attention', 'scroll'].includes(type)) {
                return res.status(400).json({ error: 'Invalid heatmap type.' });
            }

            const heatmap = await Heatmap.findOne({ test: testId, type })
                .sort({ generatedAt: -1 });

            if (!heatmap) {
                return res.status(404).json({
                    error: 'Heatmap not generated yet. Use POST /api/heatmaps/generate/:testId to create one.',
                });
            }

            res.json({ heatmap });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Heatmap get error:`, error);
            res.status(500).json({ error: 'Failed to fetch heatmap.' });
        }
    }
);

export default router;
