import { Router } from 'express';
import auth from '../middleware/auth.js';
import Test from '../models/Test.js';
import Session from '../models/Session.js';
import Heatmap from '../models/Heatmap.js';
import AIInsight from '../models/AIInsight.js';

const router = Router();

// ── DELETE /api/admin/reset-test-data ────────────────────────
// No privileged role to gate this behind anymore — scoped to isTestData
// records only (seeded/demo data), never real participant data. Also scoped
// to the calling user's own tests: it must never touch another owner's
// isTestData records, since any holder of a self-provisioned access token
// can reach this route.
router.delete('/reset-test-data', auth, async (req, res) => {
    try {
        console.log(`[${new Date().toISOString()}] Admin reset-test-data initiated by user ${req.user._id}`);

        const ownTestIds = await Test.find({
            researcher: req.user._id,
            isTestData: true,
        }).distinct('_id');

        const [tests, sessions, heatmaps, insights] = await Promise.all([
            Test.deleteMany({ _id: { $in: ownTestIds }, isTestData: true }),
            Session.deleteMany({ test: { $in: ownTestIds }, isTestData: true }),
            Heatmap.deleteMany({ test: { $in: ownTestIds }, isTestData: true }),
            AIInsight.deleteMany({ test: { $in: ownTestIds }, isTestData: true }),
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
