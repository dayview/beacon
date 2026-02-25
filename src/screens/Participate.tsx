import React, { useState, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { useInteractionCapture } from '../lib/useInteractionCapture';
import { Button } from '../components/ui/Button';

export const Participate: React.FC = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [boardUrl, setBoardUrl] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [startWidgetId, setStartWidgetId] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [isTracking, setIsTracking] = useState(true);

    const testId = new URLSearchParams(window.location.search).get('testId');

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                const maxW = width - 32;
                const maxH = height - 32;
                const scaleX = maxW / 1200;
                const scaleY = maxH / 800;
                setScale(Math.max(0.1, Math.min(scaleX, scaleY)));
            }
        });
        if (wrapperRef.current) {
            observer.observe(wrapperRef.current);
        }
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!testId) return;

        const socket = getSocket();

        const handleCreated = ({ sessionId, boardId, startWidgetId }: { sessionId: string, boardId?: string, startWidgetId?: string }) => {
            setSessionId(sessionId);
            if (boardId) {
                setBoardUrl(boardId);
            }
            if (startWidgetId) {
                setStartWidgetId(startWidgetId);
            }
        };

        const joinSession = () => {
            socket.emit('session:join', { testId, participantId: null, demographics: {} });
        };

        socket.on('session:created', handleCreated);

        if (socket.connected) {
            // Already connected — emit immediately
            joinSession();
        } else {
            // Wait for connection before emitting, so the event isn't lost
            socket.once('connect', joinSession);
            connectSocket();
        }

        return () => {
            socket.off('session:created', handleCreated);
            socket.off('connect', joinSession);
            disconnectSocket();
        };
    }, [testId]);

    useInteractionCapture({
        containerRef,
        enabled: !!sessionId && !isDone && isTracking,
        sessionId: sessionId || '',
        moveThrottleMs: 100,
        batchSize: 20,
        flushIntervalMs: 2000,
    });

    const handleDone = () => {
        if (sessionId) {
            getSocket().emit('session:complete', { sessionId });
        }
        setIsDone(true);
    };

    if (!testId) {
        return (
            <div className="flex min-h-screen items-center justify-center p-small text-center text-slate-500">
                Missing testId parameter.
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col bg-[#fafafa]">
            <div className="flex h-14 items-center justify-between bg-white px-6 border-b border-[#050038]/10">
                <span className="p-medium text-[#050038]">You are participating in a test</span>
                <div className="flex items-center gap-4">
                    {!isDone && (
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${isTracking ? 'bg-white shadow-sm text-[#050038]' : 'text-[#050038]/60 hover:text-[#050038]'}`}
                                onClick={() => setIsTracking(true)}
                            >
                                Track Heatmap
                            </button>
                            <button
                                className={`px-4 py-1.5 text-sm rounded-md transition-all font-medium ${!isTracking ? 'bg-white shadow-sm text-[#050038]' : 'text-[#050038]/60 hover:text-[#050038]'}`}
                                onClick={() => setIsTracking(false)}
                            >
                                Interact
                            </button>
                        </div>
                    )}
                    {!isDone && (
                        <Button variant="primary" onClick={handleDone}>
                            Done
                        </Button>
                    )}
                </div>
            </div>
            {isTracking && !isDone && (
                <div className="bg-[#ffd02f] text-[#050038] text-center text-xs py-1.5 font-medium">
                    Heatmap tracking is active. You cannot interact with the Miro board. Switch to "Interact" mode to explore the board.
                </div>
            )}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[#eaeaea]" ref={wrapperRef}>
                {isDone ? (
                    <div className="flex h-full w-full items-center justify-center p-large text-[#050038]">
                        Thank you for participating!
                    </div>
                ) : boardUrl ? (
                    <div
                        ref={containerRef}
                        className="relative bg-white shadow-xl ring-1 ring-black/5 flex-shrink-0 origin-center"
                        style={{
                            width: 1200,
                            height: 800,
                            transform: `scale(${scale})`,
                            transition: 'transform 0.1s ease-out'
                        }}
                    >
                        <iframe
                            src={`https://miro.com/app/live-embed/${boardUrl}/?embedAutoplay=true${startWidgetId ? `&moveToWidget=${startWidgetId}` : ''}`}
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                            title="Miro Board"
                        />
                        {/* The transparent overlay is required to capture pointer events over a cross-origin iframe.
                            We toggle it based on the isTracking state allowing users to switch between interaction and tracking. */}
                        {isTracking && (
                            <div className="absolute inset-0 z-10" style={{ pointerEvents: 'all', background: 'transparent' }} />
                        )}
                    </div>
                ) : (
                    <div className="flex h-full w-full items-center justify-center p-large text-[#050038]">
                        Loading board...
                    </div>
                )}
            </div>
        </div>
    );
};

