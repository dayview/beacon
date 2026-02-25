import { Router } from 'express';
import auth from '../middleware/auth.js';

const router = Router();

const VALID_PROVIDERS = ['openai', 'openrouter', 'anthropic', 'custom'];

// ── PUT /api/users/ai-settings ──────────────────────────────
router.put('/ai-settings', auth, async (req, res) => {
    try {
        const { provider, apiKey } = req.body;

        if (!provider || !VALID_PROVIDERS.includes(provider)) {
            return res.status(400).json({ error: 'Invalid provider.' });
        }

        const user = req.user;
        user.plan.aiProvider = provider;
        user.setAiApiKey(apiKey || null);

        await user.save();

        res.json({ success: true, provider });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Update AI settings error:`, error);
        res.status(500).json({ error: 'Failed to update AI settings.' });
    }
});

export default router;
