import { Router } from 'express';
import auth from '../middleware/auth.js';
import Test from '../models/Test.js';
import Session from '../models/Session.js';
import Heatmap from '../models/Heatmap.js';
import AIInsight from '../models/AIInsight.js';

const router = Router();

// ── DELETE /api/admin/reset-test-data ────────────────────────
router.delete('/reset-test-data', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin role required.' });
    }

    try {
        console.log(`[${new Date().toISOString()}] Admin reset-test-data initiated by user ${req.user._id}`);

        const [tests, sessions, heatmaps, insights] = await Promise.all([
            Test.deleteMany({ isTestData: true }),
            Session.deleteMany({ isTestData: true }),
            Heatmap.deleteMany({ isTestData: true }),
            AIInsight.deleteMany({ isTestData: true }),
        ]);

        const summary = {
            deleted: {
                tests: tests.deletedCount,
                sessions: sessions.deletedCount,
                heatmaps: heatmaps.deletedCount,
                insights: insights.deletedCount,
            },
        };

        console.log(`[${new Date().toISOString()}] Test data reset complete:`, summary.deleted);
        res.json(summary);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Admin reset-test-data error:`, error);
        res.status(500).json({ error: 'Failed to reset test data.' });
    }
});

export default router;
