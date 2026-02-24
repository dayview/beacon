import { Router } from 'express';
import Test from '../models/Test.js';
import Session from '../models/Session.js';
import auth from '../middleware/auth.js';
import {
    exchangeCodeForTokens,
    fetchBoards,
    syncBoard,
} from '../services/miroService.js';
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
        let { name, board, tasks, settings, type, status } = req.body;

        // Determine if 'board' is a MongoDB ObjectId or a Miro ID format.
        // Miro IDs are base64-like strings (e.g., "uXjVL1W2mU4=")
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(board);

        let boardObjectId = board;

        // If it's a Miro string ID, try to find or sync the board in our DB first
        if (!isMongoId) {
            const Board = (await import('../models/Board.js')).default;
            let existingBoard = await Board.findOne({ miroId: board });

            if (!existingBoard) {
                // Not in DB? Sync it from Miro.
                const boardsList = await fetchBoards(req.user);
                const targetMiroBoard = boardsList.find(b => b.id === board);
                if (!targetMiroBoard) {
                    return res.status(404).json({ error: 'Miro board not found in your connected account.' });
                }
                existingBoard = await syncBoard(req.user, targetMiroBoard);
            }
            boardObjectId = existingBoard._id;
        }

        const test = await Test.create({
            name,
            type: type || 'solo',
            board: boardObjectId,
            researcher: req.user._id,
            status: status === 'active' || status === 'live' ? 'active' : 'draft',
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

// ── POST /api/tests/:id/simulate ─────────────────────────────
router.post('/:id/simulate', auth, objectIdParam('id'), validate, async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            error: 'Simulation is disabled in production.'
        });
    }
    try {
        const test = await Test.findOne({ _id: req.params.id, researcher: req.user._id });
        if (!test) return res.status(404).json({ error: 'Test not found or access denied.' });

        const sessionsToCreate = req.body.count || 5;
        const newSessions = [];

        for (let i = 0; i < sessionsToCreate; i++) {
            const events = [];
            const numEvents = Math.floor(Math.random() * 20) + 10;

            // Generate some random clustered clicks
            const clusterX = Math.random() * 800 + 200;
            const clusterY = Math.random() * 400 + 100;

            for (let j = 0; j < numEvents; j++) {
                events.push({
                    type: 'click',
                    timestamp: new Date(Date.now() - Math.random() * 100000),
                    coordinates: {
                        x: clusterX + (Math.random() * 200 - 100), // Random jitter around cluster
                        y: clusterY + (Math.random() * 150 - 75)
                    }
                });
            }

            const session = new Session({
                test: test._id,
                status: 'completed',
                events,
                metrics: {
                    taskCompletionRate: Math.random() > 0.3 ? 100 : 0,
                    clickCount: numEvents,
                    pathEfficiency: Math.random() * 100
                },
                startedAt: new Date(Date.now() - 3600000),
                completedAt: new Date()
            });

            newSessions.push(session.save());
        }

        await Promise.all(newSessions);

        res.json({ success: true, count: sessionsToCreate });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Test simulate error:`, error);
        res.status(500).json({ error: 'Failed to simulate sessions.' });
    }
});

export default router;
