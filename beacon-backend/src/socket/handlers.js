import jwt from 'jsonwebtoken';
import Session from '../models/Session.js';
import Test from '../models/Test.js';
import * as events from './events.js';

/**
 * Initialize Socket.io event handlers.
 * @param {import('socket.io').Server} io
 */
export function initSocketHandlers(io) {
    // ── Auth middleware for WebSocket connections ─────────────
    io.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(' ')[1];

            if (!token) {
                // Allow anonymous participants (they'll provide info via session:join)
                socket.user = null;
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        } catch (error) {
            // Allow connection but mark as unauthenticated
            socket.user = null;
            next();
        }
    });

    io.on(events.CONNECT, (socket) => {
        console.log(
            `[${new Date().toISOString()}] Socket connected: ${socket.id} (user: ${socket.user?.id || 'anonymous'})`
        );

        // ── Researcher joins a test room to watch live ────────────
        socket.on('researcher:join', ({ testId }) => {
            if (!testId) return;
            socket.join(`test:${testId}`);
            console.log(
                `[${new Date().toISOString()}] Researcher ${socket.user?.id || socket.id} joined test:${testId}`
            );
        });

        // ── Participant joins a test session ──────────────────────
        socket.on(events.SESSION_JOIN, async (data) => {
            try {
                const { testId, participantId, demographics } = data;

                // Validate the test exists and is active
                const test = await Test.findById(testId);
                if (!test || test.status !== 'active') {
                    socket.emit(events.ERROR, {
                        message: 'Test not found or not active.',
                    });
                    return;
                }

                // Create a new session
                const session = await Session.create({
                    test: testId,
                    participant: {
                        id: participantId || null,
                        demographics: demographics || {},
                    },
                    status: 'in_progress',
                    recording: {
                        enabled: data.recordingEnabled || false,
                    },
                });

                // Join the session-specific room
                socket.join(`session:${session._id}`);
                socket.sessionId = session._id.toString();
                socket.testId = testId;

                // Notify the participant of their session ID
                socket.emit('session:created', {
                    sessionId: session._id,
                    testId,
                });

                // Broadcast to researchers watching this test
                io.to(`test:${testId}`).emit(events.PARTICIPANT_JOINED, {
                    sessionId: session._id,
                    participant: {
                        id: participantId,
                        demographics,
                    },
                    timestamp: new Date(),
                });

                console.log(
                    `[${new Date().toISOString()}] Participant joined test:${testId}, session:${session._id}`
                );
            } catch (error) {
                console.error(
                    `[${new Date().toISOString()}] session:join error:`,
                    error
                );
                socket.emit(events.ERROR, { message: 'Failed to join session.' });
            }
        });

        // ── Participant sends an event ───────────────────────────
        socket.on(events.SESSION_EVENT, async (data) => {
            try {
                const { sessionId, type, coordinates, timestamp, element, metadata } =
                    data;

                const targetSessionId = sessionId || socket.sessionId;
                if (!targetSessionId) {
                    socket.emit(events.ERROR, { message: 'No active session.' });
                    return;
                }

                const event = {
                    type,
                    timestamp: timestamp || new Date(),
                    coordinates: coordinates || { x: 0, y: 0 },
                    element: element || null,
                    metadata: metadata || {},
                };

                // Append event to the session document
                await Session.findByIdAndUpdate(targetSessionId, {
                    $push: { events: event },
                    $inc: { 'metrics.clickCount': type === 'click' ? 1 : 0 },
                });

                // Broadcast to researchers watching this test
                const session = await Session.findById(targetSessionId)
                    .select('test')
                    .lean();
                if (session) {
                    io.to(`test:${session.test}`).emit(events.PARTICIPANT_EVENT, {
                        sessionId: targetSessionId,
                        event,
                    });
                }
            } catch (error) {
                console.error(
                    `[${new Date().toISOString()}] session:event error:`,
                    error
                );
            }
        });

        // ── Participant completes a session ──────────────────────
        socket.on(events.SESSION_COMPLETE, async (data) => {
            try {
                const { sessionId, metrics } = data;
                const targetSessionId = sessionId || socket.sessionId;
                if (!targetSessionId) return;

                const session = await Session.findByIdAndUpdate(
                    targetSessionId,
                    {
                        $set: {
                            status: 'completed',
                            completedAt: new Date(),
                            ...(metrics && { metrics }),
                        },
                    },
                    { new: true }
                );

                if (session) {
                    // Broadcast to researchers
                    io.to(`test:${session.test}`).emit(events.PARTICIPANT_LEFT, {
                        sessionId: session._id,
                        reason: 'completed',
                    });

                    // Leave rooms
                    socket.leave(`session:${session._id}`);
                }

                console.log(
                    `[${new Date().toISOString()}] Session completed: ${targetSessionId}`
                );
            } catch (error) {
                console.error(
                    `[${new Date().toISOString()}] session:complete error:`,
                    error
                );
            }
        });

        // ── Disconnect cleanup ───────────────────────────────────
        socket.on(events.DISCONNECT, async (reason) => {
            console.log(
                `[${new Date().toISOString()}] Socket disconnected: ${socket.id} (${reason})`
            );

            // Mark the session as abandoned if it was in progress
            if (socket.sessionId) {
                try {
                    const session = await Session.findById(socket.sessionId);
                    if (session && session.status === 'in_progress') {
                        session.status = 'abandoned';
                        session.completedAt = new Date();
                        await session.save();

                        // Notify researchers
                        io.to(`test:${session.test}`).emit(events.PARTICIPANT_LEFT, {
                            sessionId: session._id,
                            reason: 'disconnected',
                        });
                    }
                } catch (error) {
                    console.error(
                        `[${new Date().toISOString()}] Disconnect cleanup error:`,
                        error
                    );
                }
            }
        });
    });
}
