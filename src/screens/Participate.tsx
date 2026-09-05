import React, { useState, useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket, getSocket, emitSessionEvent } from '../lib/socket';
import { Button } from '../components/ui/Button';

interface Step {
    id: string;
    description: string;
    targetElement: string;
}

export const Participate: React.FC = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [boardUrl, setBoardUrl] = useState<string | null>(null);
    const [isDone, setIsDone] = useState(false);
    const [startWidgetId, setStartWidgetId] = useState<string | null>(null);
    const [steps, setSteps] = useState<Step[]>([]);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const stepStartedAtRef = useRef<number>(Date.now());

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

        const handleCreated = ({ sessionId, boardId, startWidgetId, steps }: { sessionId: string, boardId?: string, startWidgetId?: string, steps?: Step[] }) => {
            setSessionId(sessionId);
            if (boardId) {
                setBoardUrl(boardId);
            }
            if (startWidgetId) {
                setStartWidgetId(startWidgetId);
            }
            setSteps(steps || []);
            stepStartedAtRef.current = Date.now();
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

    const handleDone = () => {
        if (sessionId) {
            getSocket().emit('session:complete', { sessionId });
        }
        setIsDone(true);
    };

    // Advance (or step back) through the frame-per-step walkthrough. Dwell
    // time on the step just left, plus which direction the participant
    // moved, is the real signal here — Miro's live-embed gives no way to
    // observe clicks inside the cross-origin iframe, so per-step time +
    // backtracking stands in for raw interaction capture.
    const goToStep = (nextIndex: number, direction: 'forward' | 'backward') => {
        const currentStep = steps[currentStepIndex];
        if (sessionId && currentStep) {
            emitSessionEvent({
                sessionId,
                type: 'task_complete',
                coordinates: { x: 0, y: 0 },
                element: currentStep.targetElement,
                frameId: currentStep.targetElement,
                metadata: {
                    taskId: currentStep.id,
                    dwellMs: Date.now() - stepStartedAtRef.current,
                    direction,
                },
            });
        }

        if (nextIndex >= steps.length) {
            handleDone();
            return;
        }

        setCurrentStepIndex(nextIndex);
        stepStartedAtRef.current = Date.now();
    };

    if (!testId) {
        return (
            <div className="flex min-h-screen items-center justify-center p-small text-center text-slate-500">
                Missing testId parameter.
            </div>
        );
    }

    const hasSteps = steps.length > 0;
    const currentStep = hasSteps ? steps[currentStepIndex] : null;
    const currentWidgetId = currentStep?.targetElement || startWidgetId;
    const isLastStep = hasSteps && currentStepIndex === steps.length - 1;

    return (
        <div className="flex h-screen flex-col bg-[#fafafa]">
            <div className="flex h-14 items-center justify-between bg-white px-6 border-b border-[#050038]/10">
                <span className="p-medium text-[#050038]">
                    {currentStep ? currentStep.description : 'You are participating in a test'}
                </span>
                <div className="flex items-center gap-2">
                    {!isDone && hasSteps && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => goToStep(currentStepIndex - 1, 'backward')}
                                disabled={currentStepIndex === 0}
                            >
                                Back
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => goToStep(currentStepIndex + 1, 'forward')}
                            >
                                {isLastStep ? 'Finish' : 'Next'}
                            </Button>
                        </>
                    )}
                    {!isDone && !hasSteps && (
                        <Button variant="primary" onClick={handleDone}>
                            Done
                        </Button>
                    )}
                </div>
            </div>
            {hasSteps && !isDone && (
                <div className="bg-[#ffd02f] text-[#050038] text-center text-xs py-1.5 font-medium">
                    Step {currentStepIndex + 1} of {steps.length} — explore this section, then continue.
                </div>
            )}
            <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-[#eaeaea]" ref={wrapperRef}>
                {isDone ? (
                    <div className="flex h-full w-full items-center justify-center p-large text-[#050038]">
                        Thank you for participating!
                    </div>
                ) : boardUrl ? (
                    <div
                        className="relative bg-white shadow-xl ring-1 ring-black/5 flex-shrink-0 origin-center"
                        style={{
                            width: 1200,
                            height: 800,
                            transform: `scale(${scale})`,
                            transition: 'transform 0.1s ease-out'
                        }}
                    >
                        <iframe
                            key={currentWidgetId || 'default'}
                            src={`https://miro.com/app/live-embed/${boardUrl}/?autoplay=true${currentWidgetId ? `&moveToWidget=${currentWidgetId}` : ''}`}
                            width="100%"
                            height="100%"
                            style={{ border: 'none' }}
                            title="Miro Board"
                        />
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
