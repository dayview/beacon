import React, { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// @ts-expect-error — @mirohq/websdk ships without full TS declarations
import miro from "@mirohq/websdk";

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
    useEffect(() => {
        const handler = async () => {
            if (!sessionIdRef.current || !socketRef.current || !isConnected) return;

            try {
                const selection = await miro.board.getSelection();
                if (!selection || selection.length === 0) return;

                const item = selection[0];
                const viewport = await miro.board.viewport.get();

                const xPercent = viewport.width
                    ? ((item.x - viewport.x) / viewport.width) * 100
                    : 0;
                const yPercent = viewport.height
                    ? ((item.y - viewport.y) / viewport.height) * 100
                    : 0;

                socketRef.current.emit('session:event', {
                    sessionId: sessionIdRef.current,
                    type: 'click',
                    coordinates: { x: xPercent, y: yPercent },
                    timestamp: Date.now(),
                    element: 'miro_sdk',
                    metadata: {},
                });
            } catch (err) {
                console.error('[MiroPanel] selection tracking error:', err);
            }
        };

        miro.board.ui.on('selection:update', handler);
        return () => {
            miro.board.ui.off('selection:update', handler);
        };
    }, [isConnected]);

    // 4. Miro SDK event tracking — cursor position (mousemove)
    useEffect(() => {
        const handler = async (event: { x: number; y: number }) => {
            const now = Date.now();
            if (now - lastCursorRef.current < 100) return;
            lastCursorRef.current = now;

            if (!sessionIdRef.current || !socketRef.current || !isConnected) return;

            try {
                const viewport = await miro.board.viewport.get();
                const xPercent = viewport.width
                    ? ((event.x - viewport.x) / viewport.width) * 100
                    : 0;
                const yPercent = viewport.height
                    ? ((event.y - viewport.y) / viewport.height) * 100
                    : 0;

                socketRef.current.emit('session:event', {
                    sessionId: sessionIdRef.current,
                    type: 'mousemove',
                    coordinates: { x: xPercent, y: yPercent },
                    timestamp: Date.now(),
                    element: 'miro_sdk',
                    metadata: {},
                });
            } catch (err) {
                console.error('[MiroPanel] cursor tracking error:', err);
            }
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
