import React, { useState, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket';
import { useInteractionCapture } from '../lib/useInteractionCapture';
import { Button } from '../components/ui/Button';

export const Participate: React.FC = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const testId = new URLSearchParams(window.location.search).get('testId');

    useEffect(() => {
        if (!testId) return;

        if (!getSocket().connected) {
            connectSocket();
        }

        const socket = getSocket();

        const handleCreated = ({ sessionId }: { sessionId: string }) => {
            setSessionId(sessionId);
        };

        socket.on('session:created', handleCreated);
        socket.emit('session:join', { testId, participantId: null, demographics: {} });

        return () => {
            socket.off('session:created', handleCreated);
            disconnectSocket();
        };
    }, [testId]);

    useInteractionCapture({
        containerRef,
        enabled: !!sessionId && !isDone,
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
                {!isDone && (
                    <Button variant="primary" onClick={handleDone}>
                        Done
                    </Button>
                )}
            </div>
            <div className="flex-1 overflow-hidden relative" ref={containerRef}>
                {isDone ? (
                    <div className="flex h-full items-center justify-center p-large text-[#050038]">
                        Thank you for participating!
                    </div>
                ) : (
                    <iframe
                        src={`https://miro.com/app/live-embed/${testId}/?embedAutoplay=true`}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        title="Miro Board"
                    />
                )}
            </div>
        </div>
    );
};
