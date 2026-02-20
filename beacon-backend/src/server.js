import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import connectDB from './config/database.js';
import { initSocketHandlers } from './socket/handlers.js';

// Route imports
import authRoutes from './routes/auth.js';
import miroRoutes from './routes/miro.js';
import testRoutes from './routes/tests.js';
import sessionRoutes from './routes/sessions.js';
import aiRoutes from './routes/ai.js';
import analyticsRoutes from './routes/analytics.js';
import workspaceRoutes from './routes/workspaces.js';
import heatmapRoutes from './routes/heatmaps.js';

// ── Express app ──────────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

// ── CORS ─────────────────────────────────────────────────────
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
};
app.use(cors(corsOptions));

// ── Body parsing ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,                 // limit each IP to 200 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// ── Socket.io ────────────────────────────────────────────────
const io = new Server(httpServer, {
    cors: corsOptions,
    pingTimeout: 60000,
});
initSocketHandlers(io);
// Make io accessible to routes if needed
app.set('io', io);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/miro', miroRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/heatmaps', heatmapRoutes);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;

connectDB().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`[${new Date().toISOString()}] Beacon server running on port ${PORT}`);
        console.log(`[${new Date().toISOString()}] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
});

export { app, httpServer, io };
