import { Router } from 'express';
import auth from '../middleware/auth.js';
import {
    exchangeCodeForTokens,
    fetchBoards,
    syncBoard,
} from '../services/miroService.js';

const router = Router();

// Miro image URLs (board thumbnails) are always served from a miro.com
// subdomain. The thumbnails route below fetches a URL with the user's Miro
// bearer token attached, so it must never fetch anywhere else — otherwise a
// caller could pass `?url=` pointing at an internal host or attacker server
// and have the token leaked to it (SSRF).
function isTrustedMiroImageUrl(urlString) {
    let parsed;
    try {
        parsed = new URL(urlString);
    } catch {
        return false;
    }
    return parsed.protocol === 'https:'
        && (parsed.hostname === 'miro.com' || parsed.hostname.endsWith('.miro.com'));
}

// ── GET /api/miro/authorize ─────────────────────────────
// Step 1: Initiate OAuth - redirect user to Miro's auth screen
// The Beacon access token is passed as 'state' so we can recover the owner
// after the redirect — it's already an opaque per-owner secret, so no
// signing/decoding is needed, just a direct lookup on callback.
router.get('/authorize', auth, (req, res) => {
    const state = req.token;
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
        const User = (await import('../models/User.js')).default;
        const user = await User.findOne({ accessToken: state });
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
                sharingPolicy: b.sharingPolicy?.access ?? b.sharingData?.access ?? null,
            })),
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Miro boards error:`, error);
        res.status(500).json({ error: 'Failed to fetch boards.' });
    }
});

// ── GET /api/miro/thumbnails/:boardId ────────────────────────
// Proxy board thumbnails, as the raw imageURL requires Auth headers.
// Uses the shared `auth` middleware, which already accepts ?token= for
// exactly this kind of plain <img src> usage that can't set headers.
router.get('/thumbnails/:boardId', auth, async (req, res) => {
    try {
        const { getValidToken } = await import('../services/miroService.js');
        const miroToken = await getValidToken(req.user);

        // Use the board picture URL if passed in query, else fetch it
        let imageUrl = req.query.url;
        if (imageUrl && !isTrustedMiroImageUrl(imageUrl)) {
            return res.status(400).send('Invalid thumbnail URL.');
        }

        if (!imageUrl) {
            const response = await fetch(`https://api.miro.com/v2/boards/${req.params.boardId}`, {
                headers: { Authorization: `Bearer ${miroToken}` }
            });
            if (!response.ok) return res.status(404).send('Board not found');
            const data = await response.json();
            imageUrl = data.picture?.imageURL;
        }

        if (!imageUrl || !isTrustedMiroImageUrl(imageUrl)) {
            return res.status(404).send('No thumbnail available');
        }

        // Fetch the actual image binary
        const imageRes = await fetch(imageUrl, {
            headers: { Authorization: `Bearer ${miroToken}` }
        });

        if (!imageRes.ok) return res.status(imageRes.status).send('Failed to fetch image');

        const contentType = imageRes.headers.get('content-type');
        res.set('Content-Type', contentType?.startsWith('image/') ? contentType : 'application/octet-stream');

        const buffer = await imageRes.arrayBuffer();
        res.send(Buffer.from(buffer));

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Miro thumbnail error:`, error);
        res.status(500).send('Thumbnail fetch failed');
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
