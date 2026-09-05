import { Router } from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';

const router = Router();

// ── POST /api/auth/start ─────────────────────────────────────
// Provision a new anonymous owner and its private access token — no
// email, password, or name required. The frontend calls this once, the
// first time it needs a token, and turns the returned token into that
// owner's private dashboard link.
router.post('/start', async (req, res) => {
    try {
        const user = await User.create({});
        res.status(201).json({
            token: user.accessToken,
            user: user.toSafeObject(),
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Auth start error:`, error);
        res.status(500).json({ error: 'Failed to start a session.' });
    }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
    try {
        res.json({ user: req.user.toSafeObject() });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Auth/me error:`, error);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

export default router;
