import { useRef, useCallback, useEffect } from 'react';
import { emitSessionEvent } from './socket';

interface CapturedEvent {
    type: 'click' | 'hover' | 'scroll';
    coordinates: { x: number; y: number };
    timestamp: Date;
    element: string | null;
}

interface UseInteractionCaptureOptions {
    /** The container element ref to attach listeners to */
    containerRef: React.RefObject<HTMLElement | null>;
    /** Whether capture is active */
    enabled: boolean;
    /** Session ID (for Socket.IO tracking) */
    sessionId?: string;
    /** Throttle interval for mousemove in ms (default: 100) */
    moveThrottleMs?: number;
    /** Batch size before flushing (default: 20) */
    batchSize?: number;
    /** Flush interval in ms (default: 2000) */
    flushIntervalMs?: number;
}

interface UseInteractionCaptureReturn {
    /** All captured events (local copy) */
    events: CapturedEvent[];
    /** Clear all captured events */
    clearEvents: () => void;
}

/**
 * Hook that captures real click, mousemove, and scroll events
 * on a container element, batches them, and sends them to the
 * backend via Socket.IO.
 */
export function useInteractionCapture({
    containerRef,
    enabled,
    sessionId,
    moveThrottleMs = 100,
    batchSize = 20,
    flushIntervalMs = 2000,
}: UseInteractionCaptureOptions): UseInteractionCaptureReturn {
    const eventsRef = useRef<CapturedEvent[]>([]);
    const batchRef = useRef<CapturedEvent[]>([]);
    const lastMoveTime = useRef(0);
    const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const flush = useCallback(() => {
        if (batchRef.current.length === 0) return;

        const batch = [...batchRef.current];
        batchRef.current = [];

        // Send each event via Socket.IO
        for (const evt of batch) {
            emitSessionEvent({
                sessionId,
                type: evt.type,
                coordinates: evt.coordinates,
                timestamp: evt.timestamp,
                element: evt.element || undefined,
            });
        }
    }, [sessionId]);

    const addEvent = useCallback(
        (evt: CapturedEvent) => {
            eventsRef.current.push(evt);
            batchRef.current.push(evt);

            if (batchRef.current.length >= batchSize) {
                flush();
            }
        },
        [batchSize, flush]
    );

    const getElementId = (el: EventTarget | null): string | null => {
        if (!el || !(el instanceof HTMLElement)) return null;
        return el.id || el.dataset.testid || el.tagName.toLowerCase();
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container || !enabled) return;

        const handleClick = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            addEvent({
                type: 'click',
                coordinates: {
                    x: Math.round(e.clientX - rect.left),
                    y: Math.round(e.clientY - rect.top),
                },
                timestamp: new Date(),
                element: getElementId(e.target),
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            const now = Date.now();
            if (now - lastMoveTime.current < moveThrottleMs) return;
            lastMoveTime.current = now;

            const rect = container.getBoundingClientRect();
            addEvent({
                type: 'hover',
                coordinates: {
                    x: Math.round(e.clientX - rect.left),
                    y: Math.round(e.clientY - rect.top),
                },
                timestamp: new Date(),
                element: getElementId(e.target),
            });
        };

        const handleScroll = () => {
            addEvent({
                type: 'scroll',
                coordinates: {
                    x: container.scrollLeft,
                    y: container.scrollTop,
                },
                timestamp: new Date(),
                element: null,
            });
        };

        container.addEventListener('click', handleClick);
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('scroll', handleScroll, { passive: true });

        // Start flush interval
        flushTimerRef.current = setInterval(flush, flushIntervalMs);

        return () => {
            container.removeEventListener('click', handleClick);
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('scroll', handleScroll);
            if (flushTimerRef.current) {
                clearInterval(flushTimerRef.current);
            }
            flush(); // Flush remaining on unmount
        };
    }, [containerRef, enabled, addEvent, flush, moveThrottleMs, flushIntervalMs]);

    const clearEvents = useCallback(() => {
        eventsRef.current = [];
        batchRef.current = [];
    }, []);

    return {
        events: eventsRef.current,
        clearEvents,
    };
}
