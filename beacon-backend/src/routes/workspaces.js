import { Router } from 'express';
import Workspace from '../models/Workspace.js';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { body } from 'express-validator';
import { objectIdParam, validate } from '../middleware/validation.js';

const router = Router();

// ── POST /api/workspaces ─────────────────────────────────────
router.post(
    '/',
    auth,
    [body('name').trim().notEmpty().withMessage('Workspace name is required')],
    validate,
    async (req, res) => {
        try {
            const workspace = await Workspace.create({
                name: req.body.name,
                members: [req.user._id],
            });

            // Link workspace to the creating user
            req.user.workspace = workspace._id;
            await req.user.save();

            res.status(201).json({ workspace });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Workspace create error:`, error);
            res.status(500).json({ error: 'Failed to create workspace.' });
        }
    }
);

// ── GET /api/workspaces ──────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const workspaces = await Workspace.find({ members: req.user._id })
            .populate('members', 'name email role')
            .populate('boards', 'name miroId thumbnailUrl');

        res.json({ workspaces });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Workspace list error:`, error);
        res.status(500).json({ error: 'Failed to fetch workspaces.' });
    }
});

// ── GET /api/workspaces/:id ──────────────────────────────────
router.get('/:id', auth, objectIdParam('id'), validate, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id)
            .populate('members', 'name email role')
            .populate('boards', 'name miroId thumbnailUrl lastSyncedAt');

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found.' });
        }

        // Check membership
        if (!workspace.members.some((m) => m._id.equals(req.user._id))) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        res.json({ workspace });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Workspace get error:`, error);
        res.status(500).json({ error: 'Failed to fetch workspace.' });
    }
});

// ── PATCH /api/workspaces/:id ────────────────────────────────
router.patch(
    '/:id',
    auth,
    objectIdParam('id'),
    [body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')],
    validate,
    async (req, res) => {
        try {
            const workspace = await Workspace.findById(req.params.id);

            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found.' });
            }

            if (!workspace.members.includes(req.user._id)) {
                return res.status(403).json({ error: 'Access denied.' });
            }

            if (req.body.name) workspace.name = req.body.name;
            await workspace.save();

            res.json({ workspace });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Workspace update error:`, error);
            res.status(500).json({ error: 'Failed to update workspace.' });
        }
    }
);

// ── DELETE /api/workspaces/:id ───────────────────────────────
router.delete('/:id', auth, objectIdParam('id'), validate, async (req, res) => {
    try {
        const workspace = await Workspace.findById(req.params.id);

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found.' });
        }

        if (!workspace.members.includes(req.user._id)) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        // Unset workspace reference for all members
        await User.updateMany(
            { workspace: workspace._id },
            { $unset: { workspace: '' } }
        );

        await workspace.deleteOne();

        res.json({ success: true });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Workspace delete error:`, error);
        res.status(500).json({ error: 'Failed to delete workspace.' });
    }
});

// ── POST /api/workspaces/:id/members ─────────────────────────
// Invite a member by email
router.post(
    '/:id/members',
    auth,
    objectIdParam('id'),
    [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
    validate,
    async (req, res) => {
        try {
            const workspace = await Workspace.findById(req.params.id);

            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found.' });
            }

            if (!workspace.members.includes(req.user._id)) {
                return res.status(403).json({ error: 'Access denied.' });
            }

            const invitee = await User.findOne({ email: req.body.email });
            if (!invitee) {
                return res.status(404).json({ error: 'User not found. They must register first.' });
            }

            if (workspace.members.includes(invitee._id)) {
                return res.status(409).json({ error: 'User is already a member.' });
            }

            workspace.members.push(invitee._id);
            await workspace.save();

            // Link workspace to the invited user
            invitee.workspace = workspace._id;
            await invitee.save();

            res.json({
                success: true,
                message: `${invitee.name} added to workspace.`,
                workspace,
            });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Add member error:`, error);
            res.status(500).json({ error: 'Failed to add member.' });
        }
    }
);

// ── DELETE /api/workspaces/:id/members/:userId ───────────────
// Remove a member
router.delete(
    '/:id/members/:userId',
    auth,
    objectIdParam('id'),
    objectIdParam('userId'),
    validate,
    async (req, res) => {
        try {
            const workspace = await Workspace.findById(req.params.id);

            if (!workspace) {
                return res.status(404).json({ error: 'Workspace not found.' });
            }

            if (!workspace.members.includes(req.user._id)) {
                return res.status(403).json({ error: 'Access denied.' });
            }

            workspace.members = workspace.members.filter(
                (m) => m.toString() !== req.params.userId
            );
            await workspace.save();

            // Unset workspace for removed user
            await User.findByIdAndUpdate(req.params.userId, {
                $unset: { workspace: '' },
            });

            res.json({ success: true, workspace });
        } catch (error) {
            console.error(`[${new Date().toISOString()}] Remove member error:`, error);
            res.status(500).json({ error: 'Failed to remove member.' });
        }
    }
);

export default router;
