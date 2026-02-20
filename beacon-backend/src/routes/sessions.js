import { Router } from 'express';
import Session from '../models/Session.js';
import auth from '../middleware/auth.js';
import { objectIdParam, validate } from '../middleware/validation.js';

const router = Router();

// ── GET /api/sessions/:id ────────────────────────────────────
router.get('/:id', auth, objectIdParam('id'), validate, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id)
            .populate('test', 'name status tasks')
            .populate('participant.id', 'name email');

        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        res.json({ session });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Session get error:`, error);
        res.status(500).json({ error: 'Failed to fetch session.' });
    }
});

// ── GET /api/sessions/:id/events ─────────────────────────────
router.get('/:id/events', auth, objectIdParam('id'), validate, async (req, res) => {
    try {
        const session = await Session.findById(req.params.id).select('events').lean();

        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        res.json({ events: session.events || [] });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Session events error:`, error);
        res.status(500).json({ error: 'Failed to fetch session events.' });
    }
});

// ── POST /api/sessions/:id/complete ──────────────────────────
router.post('/:id/complete', auth, objectIdParam('id'), validate, async (req, res) => {
    try {
        const { metrics } = req.body;

        const session = await Session.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    status: 'completed',
                    completedAt: new Date(),
                    ...(metrics && { metrics }),
                },
            },
            { new: true }
        );

        if (!session) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        // Broadcast completion via WebSocket
        const io = req.app.get('io');
        if (io) {
            io.to(`test:${session.test}`).emit('participant:left', {
                sessionId: session._id,
                reason: 'completed',
            });
        }

        res.json({ session });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Session complete error:`, error);
        res.status(500).json({ error: 'Failed to complete session.' });
    }
});

export default router;
