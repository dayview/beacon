import AIInsight from '../models/AIInsight.js';
import Session from '../models/Session.js';

/**
 * Plan tier limits configuration.
 */
const PLAN_LIMITS = {
    free: {
        maxInsightsPerMonth: 10,
        maxSessionsPerTest: 5,
        recordingEnabled: false,
    },
    pro: {
        maxInsightsPerMonth: 100,
        maxSessionsPerTest: 50,
        recordingEnabled: true,
    },
    enterprise: {
        maxInsightsPerMonth: -1, // unlimited
        maxSessionsPerTest: -1,  // unlimited
        recordingEnabled: true,
    },
};

/**
 * Get the limits for a given plan tier.
 */
export const getPlanLimits = (tier) => {
    return PLAN_LIMITS[tier] || PLAN_LIMITS.free;
};

/**
 * Middleware: check AI insight quota before generating.
 */
export const checkAIQuota = async (req, res, next) => {
    try {
        const user = req.user;
        const limits = getPlanLimits(user.plan.tier);

        if (limits.maxInsightsPerMonth === -1) return next(); // unlimited

        // Count insights generated this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const count = await AIInsight.countDocuments({
            test: { $in: await _getUserTestIds(user._id) },
            generatedAt: { $gte: startOfMonth },
        });

        if (count >= limits.maxInsightsPerMonth) {
            return res.status(429).json({
                error: `AI insight quota exceeded. Your ${user.plan.tier} plan allows ${limits.maxInsightsPerMonth} insights per month.`,
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware: check session quota before creating a new session.
 */
export const checkSessionQuota = async (req, res, next) => {
    try {
        const user = req.user;
        const limits = getPlanLimits(user.plan.tier);
        const testId = req.params.id || req.body.testId;

        if (limits.maxSessionsPerTest === -1) return next(); // unlimited

        const sessionCount = await Session.countDocuments({ test: testId });
        if (sessionCount >= limits.maxSessionsPerTest) {
            return res.status(429).json({
                error: `Session quota exceeded. Your ${user.plan.tier} plan allows ${limits.maxSessionsPerTest} sessions per test.`,
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware: check if recording is allowed by user's plan.
 */
export const checkRecordingAccess = (req, res, next) => {
    const user = req.user;
    const limits = getPlanLimits(user.plan.tier);

    if (!limits.recordingEnabled) {
        return res.status(403).json({
            error: 'Recording is not available on your current plan. Upgrade to Pro or Enterprise.',
        });
    }

    next();
};

// Helper: get all test IDs for a user
async function _getUserTestIds(userId) {
    // Lazy import to avoid circular dependencies
    const Test = (await import('../models/Test.js')).default;
    const tests = await Test.find({ researcher: userId }).select('_id').lean();
    return tests.map((t) => t._id);
}
