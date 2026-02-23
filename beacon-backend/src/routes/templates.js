import { Router } from 'express';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import Template from '../models/Template.js';
import { copyBoard } from '../services/miroService.js';

const router = Router();

// ── GET /api/templates ───────────────────────────────────────
// List all templates, optionally filtered by category
router.get('/', auth, async (req, res) => {
    try {
        const filter = {};
        if (req.query.category) {
            filter.category = req.query.category;
        }

        const templates = await Template.find(filter)
            .sort({ popular: -1, createdAt: -1 })
            .lean();

        // Derive unique categories with counts
        const allTemplates = await Template.find({}).lean();
        const categoryMap = {};
        for (const t of allTemplates) {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + 1;
        }
        const categories = Object.entries(categoryMap).map(([name, count]) => ({
            name,
            count,
        }));

        res.json({ templates, categories });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Templates list error:`, error);
        res.status(500).json({ error: 'Failed to fetch templates.' });
    }
});

// ── GET /api/templates/:id ───────────────────────────────────
router.get('/:id', auth, async (req, res) => {
    try {
        const template = await Template.findById(req.params.id).lean();
        if (!template) {
            return res.status(404).json({ error: 'Template not found.' });
        }
        res.json({ template });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Template get error:`, error);
        res.status(500).json({ error: 'Failed to fetch template.' });
    }
});

// ── POST /api/templates (admin only) ─────────────────────────
router.post('/', auth, requireRole('admin'), async (req, res) => {
    try {
        const { name, description, category, color, popular, miroBoardId, thumbnailUrl } = req.body;

        if (!name || !category) {
            return res.status(400).json({ error: 'Name and category are required.' });
        }

        const template = await Template.create({
            name,
            description: description || '',
            category,
            color: color || '#4262ff',
            popular: popular || false,
            miroBoardId: miroBoardId || null,
            thumbnailUrl: thumbnailUrl || null,
            createdBy: req.user._id,
        });

        res.status(201).json({ template });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Template create error:`, error);
        res.status(500).json({ error: 'Failed to create template.' });
    }
});

// ── PATCH /api/templates/:id (admin only) ────────────────────
router.patch('/:id', auth, requireRole('admin'), async (req, res) => {
    try {
        const allowedFields = ['name', 'description', 'category', 'color', 'popular', 'miroBoardId', 'thumbnailUrl'];
        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        const template = await Template.findByIdAndUpdate(
            req.params.id,
            updates,
            { new: true, runValidators: true }
        );

        if (!template) {
            return res.status(404).json({ error: 'Template not found.' });
        }

        res.json({ template });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Template update error:`, error);
        res.status(500).json({ error: 'Failed to update template.' });
    }
});

// ── DELETE /api/templates/:id (admin only) ───────────────────
router.delete('/:id', auth, requireRole('admin'), async (req, res) => {
    try {
        const template = await Template.findByIdAndDelete(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found.' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Template delete error:`, error);
        res.status(500).json({ error: 'Failed to delete template.' });
    }
});

// ── POST /api/templates/:id/use ──────────────────────────────
// Use a template — copies the linked Miro board if available
router.post('/:id/use', auth, async (req, res) => {
    try {
        const template = await Template.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ error: 'Template not found.' });
        }

        // If no Miro board linked, just acknowledge the template was applied
        if (!template.miroBoardId) {
            return res.json({
                success: true,
                template,
                board: null,
                message: `Template "${template.name}" applied. No Miro board to copy.`,
            });
        }

        // Check if user has Miro connected
        const hasMiro = req.user.hasMiroConnected;
        if (!hasMiro) {
            return res.status(400).json({
                error: 'Connect your Miro account in Settings to use this template.',
            });
        }

        // Copy the Miro board
        const newBoard = await copyBoard(
            req.user,
            template.miroBoardId,
            template.name
        );

        res.json({
            success: true,
            template,
            board: {
                id: newBoard.id,
                name: newBoard.name,
                viewLink: newBoard.viewLink,
            },
            message: `Board "${newBoard.name}" created from template.`,
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Template use error:`, error);
        res.status(500).json({ error: 'Failed to use template.' });
    }
});

export default router;
