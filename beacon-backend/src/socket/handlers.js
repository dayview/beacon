import User from '../models/User.js';
import Session from '../models/Session.js';
import Test from '../models/Test.js';
import * as events from './events.js';

/**
 * Attribute an event to a Miro frame using whatever Board.elements sync
 * data is available — direct ID match first (the event's `element` IS a
 * frame, or is a child item with a known `parentFrameId`), falling back to
 * point-in-bounds against synced frame elements when only coordinates are
 * available (e.g. free-exploration events with no specific element).
 */
function resolveFrameId(boardElements, elementMiroId, coordinates) {
    if (!boardElements || boardElements.length === 0) return null;

    if (elementMiroId) {
        const el = boardElements.find((e) => e.miroId === elementMiroId);
        if (el) {
            if (el.type === 'frame') return el.miroId;
            if (el.parentFrameId) return el.parentFrameId;
        }
    }

    if (coordinates && typeof coordinates.x === 'number' && typeof coordinates.y === 'number') {
        const frame = boardElements.find((e) =>
            e.type === 'frame' &&
            e.bounds &&
            coordinates.x >= e.bounds.x && coordinates.x <= e.bounds.x + e.bounds.width &&
            coordinates.y >= e.bounds.y && coordinates.y <= e.bounds.y + e.bounds.height
        );
        if (frame) return frame.miroId;
    }

    return null;
}

/**
 * Initialize Socket.io event handlers.
 * @param {import('socket.io').Server} io
 */
export function initSocketHandlers(io) {
    // ── Auth middleware for WebSocket connections ─────────────
    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.split(' ')[1];

            if (!token) {
                // Allow anonymous participants (they'll provide info via session:join)
                socket.user = null;
                return next();
            }

            const user = await User.findOne({ accessToken: token });
            socket.user = user || null;
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
                const test = await Test.findById(testId).populate('board');
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

                // Cache this session's board elements on the socket so
                // session:event doesn't need a DB round-trip per event to
                // resolve which frame an event belongs to.
                socket.boardElements = (test.board && Array.isArray(test.board.elements))
                    ? test.board.elements
                    : [];

                // Ordered steps for a frame-per-step walkthrough, when the
                // researcher defined tasks with a target frame. Empty when
                // the test has no tasks — the participant screen falls back
                // to free exploration of the whole board in that case.
                const steps = (Array.isArray(test.tasks) ? test.tasks : [])
                    .filter((t) => t.targetElement)
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((t) => ({ id: t.id, description: t.description, targetElement: t.targetElement }));

                // Extract startWidgetId from the first step, first frame, or first element
                let startWidgetId = null;
                if (steps.length > 0) {
                    startWidgetId = steps[0].targetElement;
                } else if (socket.boardElements.length > 0) {
                    const firstFrame = socket.boardElements.find(e => e.type === 'frame');
                    startWidgetId = firstFrame ? firstFrame.miroId : socket.boardElements[0].miroId;
                }

                // Notify the participant of their session ID
                const boardId = typeof test.board === 'object' ? test.board.miroId || test.board._id : test.board;
                socket.emit('session:created', {
                    sessionId: session._id,
                    testId,
                    boardId,
                    startWidgetId,
                    steps,
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
                const { sessionId, type, coordinates, timestamp, element, frameId, metadata } =
                    data;

                const targetSessionId = sessionId || socket.sessionId;
                if (!targetSessionId) {
                    socket.emit(events.ERROR, { message: 'No active session.' });
                    return;
                }

                // Trust an explicit frameId from the client (e.g. Participate's
                // frame-per-step flow already knows which frame is active).
                // Otherwise resolve it from the cached board elements.
                const resolvedFrameId = frameId
                    || resolveFrameId(socket.boardElements, element, coordinates);

                const event = {
                    type,
                    timestamp: timestamp || new Date(),
                    coordinates: coordinates || { x: 0, y: 0 },
                    element: element || null,
                    frameId: resolvedFrameId,
                    metadata: metadata || {},
                };

                // Append event to the session document (capped at 5000 most recent events)
                await Session.findByIdAndUpdate(targetSessionId, {
                    $push: { events: { $each: [event], $slice: -5000 } },
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
