import { Router } from 'express';
import Test from '../models/Test.js';
import Session from '../models/Session.js';
import auth from '../middleware/auth.js';
import {
    testCreateValidation,
    testUpdateValidation,
    testQueryValidation,
    objectIdParam,
    validate,
} from '../middleware/validation.js';

const router = Router();

// ── POST /api/tests ──────────────────────────────────────────
router.post('/', auth, testCreateValidation, validate, async (req, res) => {
    try {
        const { name, board, tasks, settings } = req.body;

        const test = await Test.create({
            name,
            board,
            researcher: req.user._id,
            tasks: tasks || [],
            settings: settings || {},
        });

        await test.populate('board');

        res.status(201).json({ test });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Test create error:`, error);
        res.status(500).json({ error: 'Failed to create test.' });
    }
});

// ── GET /api/tests ───────────────────────────────────────────
router.get('/', auth, testQueryValidation, validate, async (req, res) => {
    try {
        const filter = { researcher: req.user._id };

        if (req.query.status) {
            filter.status = req.query.status;
        }

        // If workspace filter provided, find boards in that workspace first
        if (req.query.workspace) {
            const Board = (await import('../models/Board.js')).default;
            const boards = await Board.find({ workspace: req.query.workspace })
                .select('_id')
                .lean();
            filter.board = { $in: boards.map((b) => b._id) };
        }

        const tests = await Test.find(filter)
            .populate('board', 'name miroId thumbnailUrl')
            .sort({ createdAt: -1 });

        res.json({ tests });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Tests list error:`, error);
        res.status(500).json({ error: 'Failed to fetch tests.' });
    }
});

// ── GET /api/tests/:id ───────────────────────────────────────
router.get('/:id', auth, objectIdParam('id'), validate, async (req, res) => {
    try {
        const test = await Test.findById(req.params.id)
            .populate('board')
            .populate('researcher', 'name email');

        if (!test) {
            return res.status(404).json({ error: 'Test not found.' });
        }

        res.json({ test });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Test get error:`, error);
        res.status(500).json({ error: 'Failed to fetch test.' });
    }
});

// ── PATCH /api/tests/:id ─────────────────────────────────────
router.patch(
    '/:id',
    auth,
    objectIdParam('id'),
    testUpdateValidation,
    validate,
    async (req, res) => {
        try {
            const { name, tasks, settings, status } = req.body;
            const update = {};

            if (name !== undefined) update.name = name;
            if (tasks !== undefined) update.tasks = tasks;
            if (settings !== undefined) update.settings = settings;
            if (status !== undefined) update.status = status;

            const test = await Test.findOneAndUpdate(
                { _id: req.params.id, researcher: req.user._id },
                { $set: update },
                { new: true, runValidators: true }
            ).populate('board');

            if (!test) {
                return res.status(404).json({ error: 'Test not found or access denied.' });
            }

            // Broadcast update via WebSocket
            const io = req.app.get('io');
            if (io) {
                io.to(`test:${test._id}`).emit('test:updated', {
                    testId: test._id,
                    changes: update,
                });
            }

            res.json({ test });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Test update error:`, error);
            res.status(500).json({ error: 'Failed to update test.' });
        }
    }
);

// ── DELETE /api/tests/:id ────────────────────────────────────
router.delete('/:id', auth, objectIdParam('id'), validate, async (req, res) => {
    try {
        const test = await Test.findOneAndDelete({
            _id: req.params.id,
            researcher: req.user._id,
        });

        if (!test) {
            return res.status(404).json({ error: 'Test not found or access denied.' });
        }

        // Clean up related sessions
        await Session.deleteMany({ test: test._id });

        res.json({ success: true });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Test delete error:`, error);
        res.status(500).json({ error: 'Failed to delete test.' });
    }
});

// ── POST /api/tests/:id/start ────────────────────────────────
router.post('/:id/start', auth, objectIdParam('id'), validate, async (req, res) => {
    try {
        const test = await Test.findOneAndUpdate(
            {
                _id: req.params.id,
                researcher: req.user._id,
                status: { $in: ['draft', 'paused'] },
            },
            {
                $set: {
                    status: 'active',
                    startedAt: new Date(),
                },
            },
            { new: true }
        ).populate('board');

        if (!test) {
            return res.status(404).json({
                error: 'Test not found, access denied, or test is not in a startable state.',
            });
        }

        // Broadcast via WebSocket
        const io = req.app.get('io');
        if (io) {
            io.to(`test:${test._id}`).emit('test:updated', {
                testId: test._id,
                changes: { status: 'active', startedAt: test.startedAt },
            });
        }

        res.json({ test });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Test start error:`, error);
        res.status(500).json({ error: 'Failed to start test.' });
    }
});

// ── GET /api/tests/:id/sessions ──────────────────────────────
router.get(
    '/:id/sessions',
    auth,
    objectIdParam('id'),
    validate,
    async (req, res) => {
        try {
            const sessions = await Session.find({ test: req.params.id })
                .select('-events') // Exclude large events array from list view
                .sort({ startedAt: -1 });

            res.json({ sessions });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Test sessions error:`, error);
            res.status(500).json({ error: 'Failed to fetch sessions.' });
        }
    }
);

export default router;
