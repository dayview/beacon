/**
 * Socket.IO client singleton for Beacon real-time features.
 */
import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io('/', {
            auth: { token: getToken() },
            transports: ['websocket', 'polling'],
            autoConnect: false,
        });
    }
    return socket;
}

export function connectSocket(): void {
    const s = getSocket();
    // Update token before connecting
    s.auth = { token: getToken() };
    if (!s.connected) {
        s.connect();
    }
}

export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// ── Typed event helpers ─────────────────────────────────────

export function joinTestRoom(testId: string): void {
    getSocket().emit('researcher:join', { testId });
}

export function emitSessionEvent(data: {
    sessionId?: string;
    type: 'click' | 'hover' | 'scroll' | 'task_complete';
    coordinates: { x: number; y: number };
    timestamp?: Date;
    element?: string;
    metadata?: Record<string, unknown>;
}): void {
    getSocket().emit('session:event', {
        ...data,
        timestamp: data.timestamp || new Date(),
    });
}

export function onParticipantEvent(
    callback: (data: {
        sessionId: string;
        event: {
            type: string;
            coordinates: { x: number; y: number };
            element: string | null;
            timestamp: string;
        };
    }) => void
): () => void {
    const s = getSocket();
    s.on('participant:event', callback);
    return () => { s.off('participant:event', callback); };
}

export function onParticipantJoined(
    callback: (data: { sessionId: string; participant: unknown; timestamp: string }) => void
): () => void {
    const s = getSocket();
    s.on('participant:joined', callback);
    return () => { s.off('participant:joined', callback); };
}

export function onParticipantLeft(
    callback: (data: { sessionId: string; reason: string }) => void
): () => void {
    const s = getSocket();
    s.on('participant:left', callback);
    return () => { s.off('participant:left', callback); };
}
