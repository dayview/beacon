import User from '../models/User.js';

/**
 * Authenticate requests via a bearer access token — the same secret that
 * appears in a user's private dashboard link (/dashboard/:accessToken).
 * There's no password or expiry to check: the token itself, looked up
 * directly, is the credential. Attaches the owning user document to req.user.
 */
const auth = async (req, res, next) => {
    try {
        let token;
        const header = req.headers.authorization;
        if (header && header.startsWith('Bearer ')) {
            token = header.split(' ')[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        const user = await User.findOne({ accessToken: token });
        if (!user) {
            return res.status(401).json({ error: 'Invalid or expired access link.' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        return res.status(500).json({ error: 'Authentication failed.' });
    }
};

export default auth;
