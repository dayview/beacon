import Board from '../models/Board.js';

const MIRO_API_BASE = 'https://api.miro.com/v2';
const MIRO_TOKEN_URL = 'https://api.miro.com/v1/oauth/token';

/**
 * Exchange an OAuth authorization code for access + refresh tokens.
 */
export async function exchangeCodeForTokens(code) {
    const response = await fetch(MIRO_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: process.env.MIRO_CLIENT_ID,
            client_secret: process.env.MIRO_CLIENT_SECRET,
            code,
            redirect_uri: process.env.MIRO_REDIRECT_URI,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Miro token exchange failed: ${err}`);
    }

    const data = await response.json();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in, // seconds
    };
}

/**
 * Refresh an expired access token using the refresh token.
 */
export async function refreshAccessToken(user) {
    const { refreshToken } = user.getMiroTokens();
    if (!refreshToken) {
        throw new Error('No Miro refresh token available. Please re-authorize.');
    }

    const response = await fetch(MIRO_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: process.env.MIRO_CLIENT_ID,
            client_secret: process.env.MIRO_CLIENT_SECRET,
            refresh_token: refreshToken,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Miro token refresh failed: ${err}`);
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    user.setMiroTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt,
    });
    await user.save();

    return data.access_token;
}

/**
 * Get a valid access token for the user, refreshing if expired.
 */
async function getValidToken(user) {
    const tokens = user.getMiroTokens();
    if (!tokens.accessToken) {
        throw new Error('Miro not connected. Please authorize via OAuth.');
    }

    // Refresh if expired (with 5 minute buffer)
    if (tokens.expiresAt && tokens.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
        return refreshAccessToken(user);
    }

    return tokens.accessToken;
}

/**
 * Fetch all boards from the user's Miro account.
 */
export async function fetchBoards(user) {
    const token = await getValidToken(user);

    const response = await fetch(`${MIRO_API_BASE}/boards?limit=50&sort=last_modified`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to fetch Miro boards: ${err}`);
    }

    const data = await response.json();
    console.log(`[miroService] fetchBoards response:`, JSON.stringify(data, null, 2));
    return data.data || [];
}

/**
 * Fetch all items from a specific Miro board.
 */
export async function fetchBoardItems(user, boardId) {
    const token = await getValidToken(user);

    const response = await fetch(`${MIRO_API_BASE}/boards/${boardId}/items?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to fetch board items: ${err}`);
    }

    const data = await response.json();
    return data.data || [];
}

/**
 * Sync a Miro board into the local database.
 * Fetches board details + items, then upserts into the Boards collection.
 */
export async function syncBoard(user, miroBoard) {
    const items = await fetchBoardItems(user, miroBoard.id);

    const elements = items.map((item) => ({
        miroId: item.id,
        type: mapMiroType(item.type),
        bounds: {
            x: item.position?.x || item.geometry?.x || 0,
            y: item.position?.y || item.geometry?.y || 0,
            width: item.geometry?.width || 0,
            height: item.geometry?.height || 0,
        },
        content: item.data?.content || item.data?.title || '',
    }));

    const board = await Board.findOneAndUpdate(
        { miroId: miroBoard.id },
        {
            name: miroBoard.name || 'Untitled Board',
            thumbnailUrl: miroBoard.picture?.imageURL || null,
            elements,
            lastSyncedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return board;
}

/**
 * Copy (duplicate) a Miro board into the user's account.
 * Uses PUT /v2/boards?copy_from={sourceBoardId}
 * @param {object} user  - Mongoose User document with Miro tokens
 * @param {string} sourceBoardId - Miro board ID to copy from
 * @param {string} newName - Name for the duplicated board
 * @returns {object} The new board object from Miro API
 */
export async function copyBoard(user, sourceBoardId, newName) {
    const token = await getValidToken(user);

    const response = await fetch(
        `${MIRO_API_BASE}/boards?copy_from=${encodeURIComponent(sourceBoardId)}`,
        {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: newName,
                description: `Created from Beacon template: ${newName}`,
            }),
        }
    );

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Failed to copy Miro board: ${err}`);
    }

    return response.json();
}

/**
 * Map Miro item type strings to our schema enum values.
 */
function mapMiroType(miroType) {
    const typeMap = {
        frame: 'frame',
        sticky_note: 'sticky',
        shape: 'shape',
        text: 'text',
    };
    return typeMap[miroType] || 'shape';
}
