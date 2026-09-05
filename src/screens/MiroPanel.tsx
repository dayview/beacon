/// <reference types="vite/client" />
import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// The Miro Web SDK is injected as a global by the Miro platform at runtime.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const miro: any;

const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
    : 'http://localhost:5000';

export const MiroPanel: React.FC = () => {
    const socketRef = useRef<Socket | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [boardId, setBoardId] = useState<string | null>(null);
    const lastCursorRef = useRef<number>(0);

    // 1. Initialise Miro SDK — register panel + get board info
    useEffect(() => {
        const init = async () => {
            try {
                // Register the panel so clicking the app icon opens it
                miro.board.ui.on('icon:click', () => {
                    miro.board.ui.openPanel({ url: '/miro-panel' });
                });

                // Confirm SDK is active and capture the board ID
                const info = await miro.board.getInfo();
                setBoardId(info.id);
            } catch (err) {
                console.error('[MiroPanel] SDK init error:', err);
            }
        };

        init();
    }, []);

    // 2. Socket connection — mirrors the pattern from BoardCanvas.tsx
    useEffect(() => {
        if (!boardId) return;

        const token = localStorage.getItem('beacon-token');
        if (!token) {
            console.warn('[MiroPanel] No beacon-token in localStorage');
            return;
        }

        const socket = io(SOCKET_URL, { auth: { token } });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('session:join', { testId: boardId });
        });

        socket.on('session:created', (data: { sessionId: string }) => {
            sessionIdRef.current = data.sessionId;
        });

        socket.on('connect_error', () => setIsConnected(false));
        socket.on('disconnect', () => setIsConnected(false));

        return () => {
            if (sessionIdRef.current) {
                socket.emit('session:complete', { sessionId: sessionIdRef.current });
            }
            socket.disconnect();
        };
    }, [boardId]);

    // 3. Miro SDK event tracking — selection changes (clicks)
    // Coordinates are sent as absolute Miro board position (item.x/item.y),
    // not percent-of-current-viewport — the latter shifts with every pan/zoom
    // and makes events from different sessions impossible to aggregate
    // against the same physical spot on the board. `element` carries the
    // real Miro item ID so the backend can join it against Board.elements.
    useEffect(() => {
        const handler = async (event: { items: Array<{ id: string; type: string; x: number; y: number }> }) => {
            if (!sessionIdRef.current || !socketRef.current || !isConnected) return;
            if (!event.items || event.items.length === 0) return;

            const item = event.items[0];

            socketRef.current.emit('session:event', {
                sessionId: sessionIdRef.current,
                type: 'click',
                coordinates: { x: item.x, y: item.y },
                timestamp: Date.now(),
                element: item.id,
                metadata: { itemType: item.type },
            });
        };

        miro.board.ui.on('selection:update', handler);
        return () => {
            miro.board.ui.off('selection:update', handler);
        };
    }, [isConnected]);

    // 4. Miro SDK event tracking — cursor position (hover)
    // `experimental:cursor_position_changed` reports {x, y} already in the
    // same absolute board coordinate space as viewport.get()'s bounds (the
    // existing code's own percent-of-viewport math relied on that), so it
    // can be sent directly with no viewport lookup needed.
    useEffect(() => {
        const handler = (event: { x: number; y: number }) => {
            const now = Date.now();
            if (now - lastCursorRef.current < 100) return;
            lastCursorRef.current = now;

            if (!sessionIdRef.current || !socketRef.current || !isConnected) return;

            socketRef.current.emit('session:event', {
                sessionId: sessionIdRef.current,
                type: 'hover',
                coordinates: { x: event.x, y: event.y },
                timestamp: Date.now(),
                element: null,
                metadata: {},
            });
        };

        miro.board.ui.on('experimental:cursor_position_changed', handler);
        return () => {
            miro.board.ui.off('experimental:cursor_position_changed', handler);
        };
    }, [isConnected]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#050038]/10 bg-white shadow-sm">
                <div
                    className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                        }`}
                />
                <span className="text-sm font-medium text-[#050038]/70">
                    {isConnected ? 'Recording' : 'Connecting...'}
                </span>
            </div>
        </div>
    );
};
