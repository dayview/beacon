import { Router } from 'express';
import jwt from 'jsonwebtoken';
import auth from '../middleware/auth.js';
import {
    exchangeCodeForTokens,
    fetchBoards,
    syncBoard,
} from '../services/miroService.js';

const router = Router();

// ── GET /api/miro/authorize ─────────────────────────────
// Step 1: Initiate OAuth - redirect user to Miro's auth screen
// The Beacon JWT is passed as 'state' so we can recover the user after redirect
router.get('/authorize', auth, (req, res) => {
    const state = req.token; // the Beacon JWT
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.MIRO_CLIENT_ID,
        redirect_uri: process.env.MIRO_REDIRECT_URI,
        state, // carry JWT through the redirect
    });
    res.redirect(`https://miro.com/oauth/authorize?${params}`);
});

// ── GET /api/miro/callback ─────────────────────────────
// Step 2: Miro redirects here after user approves
router.get('/callback', async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { code, state } = req.query;

    if (!code || !state) {
        return res.redirect(`${frontendUrl}?miro_error=true`);
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(state, process.env.JWT_SECRET);
        } catch {
            return res.redirect(`${frontendUrl}?miro_error=true`);
        }

        const User = (await import('../models/User.js')).default;
        const user = await User.findById(decoded.id);
        if (!user) return res.redirect(`${frontendUrl}?miro_error=true`);

        const tokens = await exchangeCodeForTokens(code);
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        user.setMiroTokens({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt,
        });
        await user.save();

        res.redirect(`${frontendUrl}?miro_connected=true`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Miro callback error:`, error);
        res.redirect(`${frontendUrl}?miro_error=true`);
    }
});

// ── GET /api/miro/boards ─────────────────────────────────────
// Step 3: Fetch all boards from Miro
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
        res.status(500).json({ error: 'Failed to fetch boards.' });
    }
});

// ── POST /api/miro/sync/:boardId ─────────────────────────────
router.post('/sync/:boardId', auth, async (req, res) => {
    try {
        const { boardId } = req.params;
        const boards = await fetchBoards(req.user);
        const miroBoard = boards.find((b) => b.id === boardId);
        if (!miroBoard) {
            return res.status(404).json({ error: 'Board not found in your Miro account.' });
        }

        const board = await syncBoard(req.user, miroBoard);

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
