import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
    exchangeCodeForTokens,
    fetchBoards,
    syncBoard,
} from '../services/miroService.js';

const router = Router();

// ── GET /api/miro/connect?code=… ─────────────────────────────
// Miro OAuth callback — exchange code for tokens
router.get('/connect', auth, async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required.' });
        }

        const tokens = await exchangeCodeForTokens(code);
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        req.user.setMiroTokens({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt,
        });
        await req.user.save();

        res.json({ success: true, message: 'Miro account connected successfully.' });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Miro connect error:`, error);
        res.status(500).json({ error: 'Failed to connect Miro account.' });
    }
});

// ── GET /api/miro/boards ─────────────────────────────────────
router.get('/boards', auth, async (req, res) => {
    try {
        const boards = await fetchBoards(req.user);

        res.json({
            boards: boards.map((b) => ({
                id: b.id,
                name: b.name,
                description: b.description,
                picture: b.picture,
                createdAt: b.createdAt,
                modifiedAt: b.modifiedAt,
            })),
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Miro boards error:`, error);
        res.status(500).json({ error: 'Failed to fetch Miro boards.' });
    }
});

// ── POST /api/miro/sync/:boardId ─────────────────────────────
router.post('/sync/:boardId', auth, async (req, res) => {
    try {
        const { boardId } = req.params;

        // First fetch the board info from Miro
        const boards = await fetchBoards(req.user);
        const miroBoard = boards.find((b) => b.id === boardId);
        if (!miroBoard) {
            return res.status(404).json({ error: 'Board not found in your Miro account.' });
        }

        const board = await syncBoard(req.user, miroBoard);

        // Link to workspace if user has one
        if (req.user.workspace) {
            const Workspace = (await import('../models/Workspace.js')).default;
            await Workspace.findByIdAndUpdate(req.user.workspace, {
                $addToSet: { boards: board._id },
            });
        }

        res.json({ board });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Miro sync error:`, error);
        res.status(500).json({ error: 'Failed to sync board.' });
    }
});

export default router;
