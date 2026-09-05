import { Router } from 'express';
import auth from '../middleware/auth.js';
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

// ── POST /api/templates ───────────────────────────────────────
router.post('/', auth, async (req, res) => {
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

// ── PATCH /api/templates/:id ──────────────────────────────────
// A template with createdBy === null is a system/shared template (part of
// the default library) and stays editable by anyone; a user-created
// template can only be edited by its creator.
router.patch('/:id', auth, async (req, res) => {
    try {
        const existing = await Template.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Template not found.' });
        }
        if (existing.createdBy && !existing.createdBy.equals(req.user._id)) {
            return res.status(403).json({ error: 'You can only edit templates you created.' });
        }

        const allowedFields = ['name', 'description', 'category', 'color', 'popular', 'miroBoardId', 'thumbnailUrl'];
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                existing[field] = req.body[field];
            }
        }
        await existing.save();

        res.json({ template: existing });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Template update error:`, error);
        res.status(500).json({ error: 'Failed to update template.' });
    }
});

// ── DELETE /api/templates/:id ─────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
    try {
        const existing = await Template.findById(req.params.id);
        if (!existing) {
            return res.status(404).json({ error: 'Template not found.' });
        }
        if (existing.createdBy && !existing.createdBy.equals(req.user._id)) {
            return res.status(403).json({ error: 'You can only delete templates you created.' });
        }

        await existing.deleteOne();
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
