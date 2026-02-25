import React, { useState, useRef, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import h337 from "heatmap.js";
import { toast } from "sonner";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    Loader2,
    Sparkles,
    Lightbulb,
    X
} from "lucide-react";
import { api } from "../lib/api";

interface BoardCanvasProps {
    boardName: string;
    onBack: () => void;
    boardId: string;        // Miro board ID (e.g. "uXjVI...")
    testId: string;         // MongoDB test _id
    thumbnailUrl?: string;  // optional fallback image URL from Miro API
    sharingPolicy?: string | null; // Miro board sharing access level
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({ boardName, onBack, boardId, testId, thumbnailUrl, sharingPolicy }) => {
    // Socket & Session State
    const socketRef = useRef<Socket | null>(null);
    const sessionIdRef = useRef<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const lastMouseMoveRef = useRef<number>(0);

    // Heatmap State
    const [heatmapType, setHeatmapType] = useState<'click' | 'attention' | 'scroll'>('click');
    const [isGeneratingHeatmap, setIsGeneratingHeatmap] = useState(false);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [heatmapData, setHeatmapData] = useState<any[] | null>(null);
    const heatmapContainerRef = useRef<HTMLDivElement>(null);
    const heatmapInstanceRef = useRef<any>(null);

    // AI State
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [isRunningAI, setIsRunningAI] = useState(false);
    const [aiInsights, setAiInsights] = useState<any>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    // Iframe state
    const [iframeLoaded, setIframeLoaded] = useState(false);

    // Socket URL
    const SOCKET_URL = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace(/\/api$/, '')
        : 'http://localhost:5000';

    // 1. Socket Connection and Cleanup
    useEffect(() => {
        const token = localStorage.getItem('beacon-token');
        if (!token) {
            toast.error("No authentication token found.");
            return;
        }

        const socket = io(SOCKET_URL, {
            auth: { token }
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('session:join', { testId });
        });

        socket.on('session:created', (data: { sessionId: string, testId: string }) => {
            sessionIdRef.current = data.sessionId;
        });

        socket.on('connect_error', () => {
            setIsConnected(false);
            toast.error("Tracking unavailable — check connection", { id: 'socket-error' });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        return () => {
            if (sessionIdRef.current) {
                socketRef.current?.emit('session:complete', { sessionId: sessionIdRef.current });
            }
            socket.disconnect();
        };
    }, [testId, SOCKET_URL]);

    // 2. Heatmap Initialization and Resize Observer
    useEffect(() => {
        if (!heatmapContainerRef.current) return;

        heatmapInstanceRef.current = h337.create({
            container: heatmapContainerRef.current,
            radius: 40,
            maxOpacity: 0.6,
            minOpacity: 0,
            blur: 0.8
        });

        const observer = new ResizeObserver(() => {
            if (heatmapInstanceRef.current && heatmapContainerRef.current) {
                // Ensure heatmap resizes correctly
                heatmapInstanceRef.current._renderer.setDimensions(
                    heatmapContainerRef.current.offsetWidth,
                    heatmapContainerRef.current.offsetHeight
                );
            }
        });

        observer.observe(heatmapContainerRef.current);

        return () => {
            observer.disconnect();
            heatmapInstanceRef.current = null;
        };
    }, []);

    // 3. Tracking Actions
    const trackEvent = (type: 'click' | 'mousemove' | 'scroll', xPercent: number, yPercent: number) => {
        if (!sessionIdRef.current || !socketRef.current || !isConnected) return;
        socketRef.current.emit('session:event', {
            sessionId: sessionIdRef.current,
            type,
            coordinates: { x: xPercent, y: yPercent },
            timestamp: Date.now(),
            element: 'iframe_overlay',
            metadata: {}
        });
    };

    const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
        trackEvent('click', xPercent, yPercent);
    };

    const handleTrackMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const now = Date.now();
        if (now - lastMouseMoveRef.current < 100) return;
        lastMouseMoveRef.current = now;

        const rect = e.currentTarget.getBoundingClientRect();
        const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
        const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
        trackEvent('mousemove', xPercent, yPercent);
    };

    const handleTrackScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const xPercent = target.scrollWidth ? (target.scrollLeft / target.scrollWidth) * 100 : 0;
        const yPercent = target.scrollHeight ? (target.scrollTop / target.scrollHeight) * 100 : 0;
        trackEvent('scroll', xPercent, yPercent);
    };

    // 4. Heatmap Generation
    const handleGenerateHeatmap = async () => {
        try {
            setIsGeneratingHeatmap(true);

            await api.post<{ heatmap: { points: any[] } }>(
                `/api/heatmaps/generate/${testId}`,
                { type: heatmapType }
            );

            const data = await api.get<{ heatmap: { points: any[] } }>(
                `/api/heatmaps/${testId}/${heatmapType}`
            );

            if (data?.heatmap?.points) {
                setHeatmapData(data.heatmap.points);
                setShowHeatmap(true);

                if (heatmapInstanceRef.current && heatmapContainerRef.current) {
                    const rect = heatmapContainerRef.current.getBoundingClientRect();
                    const formattedPoints = data.heatmap.points.map((p: any) => ({
                        x: Math.round((p.x / 100) * rect.width),
                        y: Math.round((p.y / 100) * rect.height),
                        value: p.value || 1
                    }));

                    const maxVal = formattedPoints.length > 0
                        ? Math.max(...formattedPoints.map((p: any) => p.value))
                        : 1;

                    heatmapInstanceRef.current.setData({
                        max: maxVal,
                        data: formattedPoints
                    });
                }
            } else {
                toast("No heatmap data available to display.");
                setHeatmapData([]);
                setShowHeatmap(false);
            }
        } catch (error: any) {
            toast.error(`Heatmap generation failed: ${error.message}`);
        } finally {
            setIsGeneratingHeatmap(false);
        }
    };

    // Toggle visibility logic: sync visual toggle with internal heatmap state
    useEffect(() => {
        if (!heatmapContainerRef.current) return;
        if (showHeatmap) {
            heatmapContainerRef.current.style.opacity = "1";
        } else {
            heatmapContainerRef.current.style.opacity = "0";
        }
    }, [showHeatmap]);

    // 5. AI Analysis
    const handleRunAI = async () => {
        try {
            setIsRunningAI(true);
            setAiError(null);
            setShowAIPanel(true);

            const data = await api.post<{ insight: { insights: any } }>(
                `/api/ai/analyze/${testId}`
            );
            setAiInsights(data.insight?.insights || null);
        } catch (error: any) {
            setAiError(`AI analysis failed: ${error.message}`);
        } finally {
            setIsRunningAI(false);
        }
    };

    const handleBackClick = () => {
        if (sessionIdRef.current && socketRef.current) {
            socketRef.current.emit('session:complete', { sessionId: sessionIdRef.current });
        }
        onBack();
    };

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-[#fafafa] relative">
            {/* Top Toolbar */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#050038]/10 bg-white px-4 z-40 relative">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBackClick}
                        className="flex items-center gap-2 text-[#050038]/60 hover:text-[#050038] transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-bold text-[#050038] text-xl">Beacon</span>
                    </button>
                    <div className="h-6 w-px bg-[#050038]/10" />
                    <span className="text-sm font-medium text-[#050038]">{boardName}</span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Session Status indicator */}
                    <div className="flex items-center gap-1.5 px-2">
                        <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
                        <span className="text-sm font-medium text-[#050038]/60">
                            {isConnected ? "Recording" : "Connecting..."}
                        </span>
                    </div>

                    <div className="h-6 w-px bg-[#050038]/10" />

                    {/* Heatmap Controls */}
                    <div className="flex items-center gap-2">
                        <select
                            value={heatmapType}
                            onChange={(e) => setHeatmapType(e.target.value as any)}
                            className="rounded-md border border-[#050038]/10 px-2 py-1.5 text-sm text-[#050038] outline-none bg-white font-medium"
                        >
                            <option value="click">Click</option>
                            <option value="attention">Attention</option>
                            <option value="scroll">Scroll</option>
                        </select>

                        <button
                            onClick={handleGenerateHeatmap}
                            disabled={isGeneratingHeatmap}
                            className="flex items-center gap-2 rounded-md border border-[#050038]/10 bg-white px-3 py-1.5 text-sm font-medium text-[#050038] hover:bg-[#fafafa] transition-colors disabled:opacity-50"
                        >
                            {isGeneratingHeatmap ? <Loader2 size={16} className="animate-spin text-[#050038]/60" /> : null}
                            Generate Heatmap
                        </button>

                        {heatmapData !== null && heatmapData.length > 0 && (
                            <button
                                onClick={() => setShowHeatmap(!showHeatmap)}
                                className="flex items-center justify-center rounded-md border border-[#050038]/10 p-1.5 text-[#050038] hover:bg-[#fafafa] transition-colors"
                                title="Toggle Heatmap"
                            >
                                {showHeatmap ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                        )}
                    </div>

                    <div className="h-6 w-px bg-[#050038]/10" />

                    {/* AI Analysis Control */}
                    <button
                        onClick={handleRunAI}
                        disabled={isRunningAI}
                        className="flex items-center gap-2 rounded-md bg-[#4262ff] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#344fe6] transition-colors disabled:opacity-50"
                    >
                        {isRunningAI ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Run AI Analysis
                    </button>
                </div>
            </header>

            {/* Main Canvas Area */}
            <div className="flex-1 relative overflow-hidden bg-gray-100">
                {!iframeLoaded && boardId && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#fafafa]">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 size={24} className="animate-spin text-[#050038]/60" />
                            <span className="text-sm font-medium text-[#050038]/60">Loading Miro Board...</span>
                        </div>
                    </div>
                )}

                {/* Sharing policy warning — shown when board is not publicly accessible */}
                {(!sharingPolicy || (sharingPolicy !== 'public' && sharingPolicy !== 'view')) && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90">
                        <div className="max-w-md text-center p-6 rounded-xl border border-amber-200 bg-amber-50">
                            <h3 className="text-base font-bold text-amber-800 mb-2">Board Not Publicly Accessible</h3>
                            <p className="text-sm text-amber-700 mb-4">
                                This board's sharing is set to <strong>{sharingPolicy ?? 'restricted'}</strong>.
                                Beacon requires the board to be visible to anyone with the link.
                            </p>
                            <a
                                href={`https://miro.com/app/board/${boardId}/`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                            >
                                Open in Miro to Fix →
                            </a>
                        </div>
                    </div>
                )}

                {/* Miro Embed or Thumbnail */}
                {boardId ? (
                    <iframe
                        src={`https://miro.com/app/live-embed/${boardId}/`}
                        frameBorder="0"
                        allowFullScreen
                        allow="fullscreen"
                        className="absolute inset-0 w-full h-full"
                        onLoad={() => setIframeLoaded(true)}
                    />
                ) : (
                    <img
                        src={thumbnailUrl || ''}
                        className="absolute inset-0 w-full h-full object-cover"
                        alt="Board Thumbnail"
                        onLoad={() => setIframeLoaded(true)}
                    />
                )}

                {/* Transparent Event Tracking Overlay */}
                <div
                    className="absolute inset-0 z-10"
                    style={{ position: 'absolute', inset: 0, zIndex: 10 }}
                    onClick={handleTrackClick}
                    onMouseMove={handleTrackMouseMove}
                    onScroll={handleTrackScroll}
                />

                {/* Heatmap Canvas Overlay */}
                <div
                    ref={heatmapContainerRef}
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                    style={{ zIndex: 20 }}
                />

                {/* AI Suggestions Side Panel */}
                <div
                    className={`absolute right-0 top-0 bottom-0 z-30 w-80 bg-white border-l border-[#050038]/10 shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${showAIPanel ? 'translate-x-0' : 'translate-x-full'
                        }`}
                >
                    <div className="flex items-center justify-between p-4 border-b border-[#050038]/10 shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-[#4262ff]" />
                            <h2 className="text-base font-bold text-[#050038]">AI Insights</h2>
                        </div>
                        <button
                            onClick={() => setShowAIPanel(false)}
                            className="rounded-md p-1 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038] transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                        {isRunningAI && (
                            <div className="flex flex-col items-center justify-center h-40 gap-3">
                                <Loader2 size={24} className="animate-spin text-[#4262ff]" />
                                <span className="text-sm font-medium text-[#050038]/60">Analyzing Interactions...</span>
                            </div>
                        )}

                        {aiError && !isRunningAI && (
                            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-100">
                                {aiError}
                            </div>
                        )}

                        {aiInsights && !isRunningAI && (
                            <>
                                {/* Summary Section */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-[#050038] flex items-center gap-1.5 uppercase tracking-wide">
                                        Summary
                                    </h3>
                                    <p className="text-sm leading-relaxed text-[#050038]/80 text-justify">
                                        {aiInsights.summary}
                                    </p>
                                </div>

                                {/* Patterns Section */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-[#050038] uppercase tracking-wide">
                                        Patterns
                                    </h3>
                                    <ul className="list-disc pl-5 text-sm text-[#050038]/80 space-y-1.5">
                                        {aiInsights.patterns?.map((pattern: string, i: number) => (
                                            <li key={i}>{pattern}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Recommendations Section */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-[#050038] uppercase tracking-wide">
                                        Recommendations
                                    </h3>
                                    <ul className="space-y-2.5">
                                        {aiInsights.recommendations?.map((rec: string, i: number) => (
                                            <li key={i} className="flex gap-2.5 text-sm text-[#050038]/80 items-start bg-[#fafafa] p-2.5 rounded-lg border border-[#050038]/5">
                                                <Lightbulb size={16} className="text-[#f59e0b] shrink-0 mt-0.5" />
                                                <span className="leading-tight">{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Sentiment Section */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-[#050038] uppercase tracking-wide">
                                        Sentiment
                                    </h3>
                                    <div className="flex">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${aiInsights.sentiment === 'positive' ? 'bg-green-50 text-green-700 border-green-200' :
                                            aiInsights.sentiment === 'negative' ? 'bg-red-50 text-red-700 border-red-200' :
                                                'bg-gray-50 text-gray-700 border-gray-200'
                                            }`}>
                                            {aiInsights.sentiment}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}

                        {!isRunningAI && !aiError && !aiInsights && (
                            <div className="flex flex-col items-center justify-center h-40 text-center gap-2">
                                <Sparkles size={24} className="text-[#050038]/20" />
                                <p className="text-sm text-[#050038]/40 px-4">
                                    Run the analysis to see insights, patterns, and recommendations.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
