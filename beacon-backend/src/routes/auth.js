import { Router } from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import {
    registerValidation,
    loginValidation,
    validate,
} from '../middleware/validation.js';

const router = Router();

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', registerValidation, validate, async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ error: 'Email already registered.' });
        }

        // Create user (password is hashed via pre-save hook)
        const user = new User({
            email,
            passwordHash: password,
            name,
            role: role || 'researcher',
        });
        await user.save();

        const token = user.generateToken();

        res.status(201).json({
            token,
            user: user.toSafeObject(),
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Register error:`, error);
        res.status(500).json({ error: 'Registration failed.' });
    }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', loginValidation, validate, async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const token = user.generateToken();

        res.json({
            token,
            user: user.toSafeObject(),
        });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Login error:`, error);
        res.status(500).json({ error: 'Login failed.' });
    }
});

// ── GET /api/auth/me ─────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
    try {
        res.json({ user: req.user.toSafeObject() });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Auth/me error:`, error);
        res.status(500).json({ error: 'Failed to fetch user profile.' });
    }
});

export default router;
