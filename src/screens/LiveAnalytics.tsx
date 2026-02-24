import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MousePointer2,
  Hand,
  MessageSquare,
  Minus,
  Plus,
  Search,
  Settings,
  Pause,
  Square,
  Info,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Lock,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  Target,
  Layers,
  Loader2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";
import { createPortal } from "react-dom";
import { useTests } from "../contexts/TestContext";
import { toast } from "sonner";
import { api, ApiHeatmap, ApiAIInsight, ApiAnalyticsSummary } from "../lib/api";
import { HeatmapCanvas } from "../components/HeatmapCanvas";
import { joinTestRoom, onParticipantEvent, onParticipantJoined, onParticipantLeft } from "../lib/socket";
import { useInteractionCapture } from "../lib/useInteractionCapture";

interface LiveAnalyticsProps {
  onBack: () => void;
}

// ── HeatmapZone (kept for visual insight tooltips) ──────────
interface HeatmapZoneProps {
  intensity: 'low' | 'medium' | 'high';
  className?: string;
  style?: React.CSSProperties;
  insight: {
    title: string;
    cause: string;
    remedy: string;
  };
}

const HeatmapZone: React.FC<HeatmapZoneProps> = ({ intensity, className, style: customStyle, insight }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const zoneRef = useRef<HTMLDivElement>(null);

  const colors = {
    low: { bg: 'bg-[var(--blue500)]', border: 'border-[var(--blue500)]', text: 'textColorBlue500', z: 'z-10' },
    medium: { bg: 'bg-[var(--yellow500)]', border: 'border-[var(--yellow500)]', text: 'textColorYellow500', z: 'z-20' },
    high: { bg: 'bg-[var(--red500)]', border: 'border-[#ef4444]', text: 'textColorRed500', z: 'z-30' },
  };

  const style = colors[intensity];

  useEffect(() => {
    if (isHovered && zoneRef.current) {
      const updatePosition = () => {
        if (!zoneRef.current) return;
        const zoneRect = zoneRef.current.getBoundingClientRect();
        const tooltipHeight = 180;
        const tooltipWidth = 256;
        const margin = 16;
        const spaceAbove = zoneRect.top;
        const showBelow = spaceAbove < (tooltipHeight + margin + 20);
        setTooltipPosition(showBelow ? 'bottom' : 'top');
        const centerX = zoneRect.left + (zoneRect.width / 2);
        const tooltipLeft = centerX - (tooltipWidth / 2);
        const tooltipTop = showBelow
          ? zoneRect.bottom + margin
          : zoneRect.top - tooltipHeight - margin;
        setTooltipStyle({ position: 'fixed', top: `${tooltipTop}px`, left: `${tooltipLeft}px`, width: `${tooltipWidth}px`, zIndex: 9999 });
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true); };
    }
  }, [isHovered]);

  const tooltipContent = isHovered && (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: tooltipPosition === 'top' ? 10 : -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: tooltipPosition === 'top' ? 10 : -10, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        style={tooltipStyle}
      >
        <div className="heatmap-zone-tooltip">
          <div className="tooltip-header">
            <span className="icon"><span className="icon"><Lightbulb size={16} className={style.text} /></span></span>
            <span className="p-small">AI Insight</span>
          </div>
          <h4 className="p-small mb-1">{insight.title}</h4>
          <div className="tooltip-content-box">
            <p><span className="tooltip-label">Cause:</span> {insight.cause}</p>
            <p><span className="tooltip-label">Remedy:</span> {insight.remedy}</p>
          </div>
          <div className={cn("absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[var(--neutral900)] border-white/10",
            tooltipPosition === 'top' ? "tooltip-arrow-top" : "tooltip-arrow-bottom"
          )} />
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      <div
        ref={zoneRef}
        className={cn("heatmap-zone-container", className, style.z)}
        style={customStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={cn("heatmap-zone-bg", style.bg, isHovered ? "hovered" : "")} />
        <div className={cn("heatmap-zone-border", style.border, isHovered ? "hovered" : "")} />
      </div>
      {typeof document !== 'undefined' && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
};

// ── LiveAnalytics Component ─────────────────────────────────
export const LiveAnalytics: React.FC<LiveAnalyticsProps> = ({ onBack }) => {
  const { selectedTest, changeTestStatus } = useTests();
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'flow' | 'ai'>('overview');
  const [highlightZone, setHighlightZone] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showAiOnBoard, setShowAiOnBoard] = useState(false);

  // ── Real API state ──────────────────────────────────────
  const [heatmapData, setHeatmapData] = useState<{ x: number; y: number; intensity: number }[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<ApiAIInsight[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<ApiAnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [flowData, setFlowData] = useState<{ path: string[]; count: number; percentage: number }[]>([]);
  const [flowLoading, setFlowLoading] = useState(false);
  const [liveParticipants, setLiveParticipants] = useState(0);
  const [liveClicks, setLiveClicks] = useState(0);
  const [firstClickData, setFirstClickData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [clickDistribution, setClickDistribution] = useState<{ element: string; clicks: number; pct: number; color: string }[]>([]);

  const boardRef = useRef<HTMLDivElement>(null);
  const hasFetchedHeatmap = useRef(false);
  const hasFetchedAi = useRef(false);
  const hasFetchedFlow = useRef(false);
  const boardWidth = 1200;
  const boardHeight = 800;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 25));

  // ── Fetch analytics summary ───────────────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!selectedTest) return;
    setAnalyticsLoading(true);
    try {
      const data = await api.get<ApiAnalyticsSummary>(`/api/analytics/${selectedTest.id}/summary`);
      setAnalyticsData(data);
      setLiveParticipants(data.totalSessions || 0);
      setLiveClicks(data.confusion?.totalZones || 0);

      // Derive first-click data from element analytics
      if (data.dwellTimes && data.dwellTimes.length > 0) {
        const totalHovers = data.dwellTimes.reduce((s, d) => s + d.totalHovers, 0);
        const colors = ['#ef4444', '#ffd02f', '#4262ff', '#050038'];
        setFirstClickData(
          data.dwellTimes.slice(0, 4).map((d, i) => ({
            name: d.element,
            value: totalHovers > 0 ? Math.round((d.totalHovers / totalHovers) * 100) : 0,
            color: colors[i] || '#050038',
          }))
        );
      }
    } catch (err) {
      console.warn('[LiveAnalytics] Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [selectedTest]);

  // ── Calculate Click Distribution Helper ─────────────────
  const updateClickDistribution = useCallback((allPoints: { x: number; y: number; intensity: number }[]) => {
    const total = allPoints.length;
    if (total > 0) {
      const zones = [
        { element: 'Top-Left (CTA area)', color: '#ef4444', count: 0 },
        { element: 'Top-Right (Nav)', color: '#ffd02f', count: 0 },
        { element: 'Center (Content)', color: '#4262ff', count: 0 },
        { element: 'Bottom (Footer)', color: '#050038', count: 0 },
      ];
      for (const p of allPoints) {
        if (p.y < boardHeight / 3) {
          if (p.x < boardWidth / 2) zones[0].count++;
          else zones[1].count++;
        } else if (p.y < (boardHeight * 2) / 3) {
          zones[2].count++;
        } else {
          zones[3].count++;
        }
      }
      setClickDistribution(
        zones.map(z => ({
          element: z.element,
          clicks: z.count,
          pct: Math.round((z.count / total) * 100),
          color: z.color,
        }))
      );
    } else {
      setClickDistribution([]);
    }
  }, [boardHeight, boardWidth]);

  // ── Fetch heatmap data (only called explicitly, not on mount) ─
  const fetchHeatmap = useCallback(async () => {
    if (!selectedTest) return false;
    setHeatmapLoading(true);
    try {
      const data = await api.get<{ heatmap?: ApiHeatmap; heatmaps?: ApiHeatmap[] }>(`/api/heatmaps/${selectedTest.id}/click`);
      const allHeatmaps = data.heatmaps || (data.heatmap ? [data.heatmap] : []);
      if (allHeatmaps.length > 0) {
        const allPoints = allHeatmaps.flatMap(h => h.data);
        setHeatmapData(allPoints);
        updateClickDistribution(allPoints);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[LiveAnalytics] No heatmap data available yet:', err);
      setHeatmapData([]);
      return false;
    } finally {
      setHeatmapLoading(false);
    }
  }, [selectedTest, updateClickDistribution]);

  // ── Generate heatmap ──────────────────────────────────
  const handleGenerateHeatmap = useCallback(async () => {
    if (!selectedTest) return;
    setHeatmapLoading(true);
    try {
      const data = await api.post<{ heatmap: ApiHeatmap }>(`/api/heatmaps/generate/${selectedTest.id}`, { type: 'click' });
      if (data.heatmap) {
        setHeatmapData(data.heatmap.data);
        updateClickDistribution(data.heatmap.data);
        toast.success('Heatmap generated from session data');
      }
    } catch (err) {
      toast.error('Failed to generate heatmap. Make sure there are recorded sessions.');
    } finally {
      setHeatmapLoading(false);
    }
  }, [selectedTest, updateClickDistribution]);

  // ── Fetch AI insights ─────────────────────────────────
  const fetchAiInsights = useCallback(async () => {
    if (!selectedTest) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await api.fetchAiInsights(selectedTest.id);
      setAiInsights(data.insights || []);
    } catch (err: any) {
      console.warn('[LiveAnalytics] No AI insights available:', err);
      if (err?.status !== 404) {
        setAiError(err?.message || 'Failed to load insights.');
      }
      setAiInsights([]);
    } finally {
      setAiLoading(false);
    }
  }, [selectedTest]);

  // ── Generate new AI insights ──────────────────────────
  const handleGenerateInsights = async () => {
    if (!selectedTest) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const data = await api.post<{ insight: ApiAIInsight }>(`/api/ai/analyze/${selectedTest.id}`);
      if (data.insight) {
        setAiInsights(prev => [data.insight, ...prev]);
        toast.success(`AI insights generated via ${data.insight.provider}`);
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to generate insights';
      const errorMsg = (message.includes('API key') || message.includes('not configured'))
        ? 'AI API key not configured. Go to Settings → AI Provider to add your API key.'
        : message;
      setAiError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setAiLoading(false);
    }
  };

  // ── Fetch flow data ───────────────────────────────────
  const fetchFlow = useCallback(async () => {
    if (!selectedTest) return;
    setFlowLoading(true);
    try {
      const data = await api.get<{ topPaths?: { path: string[]; count: number; percentage: number }[]; paths?: { path: string[]; count: number; percentage: number }[] }>(`/api/analytics/${selectedTest.id}/flow`);
      setFlowData(data.topPaths || data.paths || []);
    } catch (err) {
      console.warn('[LiveAnalytics] No flow data available:', err);
      setFlowData([]);
    } finally {
      setFlowLoading(false);
    }
  }, [selectedTest]);

  // ── Interaction Capture ───────────────────────────────
  useInteractionCapture({
    containerRef: boardRef,
    enabled:
      selectedTest?.status === 'live' ||
      selectedTest?.status === 'collecting',
    sessionId: selectedTest?.id,
    moveThrottleMs: 100,
    batchSize: 20,
    flushIntervalMs: 2000,
  });

  // ── Initial data loads (analytics only — heatmap is on-demand) ──
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ── Auto-load Heatmap and Insights on Mount ────────────
  const hasFetchedOnMount = useRef(false);
  useEffect(() => {
    if (!selectedTest || hasFetchedOnMount.current) return;
    hasFetchedOnMount.current = true;

    fetchAiInsights();
    fetchHeatmap().then((hasData) => {
      if (!hasData) {
        handleGenerateHeatmap();
      }
    });
  }, [selectedTest, fetchAiInsights, fetchHeatmap, handleGenerateHeatmap]);

  // ── Lazy-load tab data ────────────────────────────────
  useEffect(() => {
    if (activeTab === 'ai' && !hasFetchedAi.current && !aiLoading) {
      hasFetchedAi.current = true;
      fetchAiInsights();
    }
    if (activeTab === 'flow' && !hasFetchedFlow.current && !flowLoading) {
      hasFetchedFlow.current = true;
      fetchFlow();
    }
    if (activeTab === 'heatmap' && !hasFetchedHeatmap.current && !heatmapLoading) {
      hasFetchedHeatmap.current = true;
      fetchHeatmap();
    }
  }, [activeTab, aiLoading, fetchAiInsights, flowLoading, fetchFlow, heatmapLoading, fetchHeatmap]);

  // ── Socket.IO real-time updates ───────────────────────
  useEffect(() => {
    if (!selectedTest || selectedTest.type !== 'live-session') return;
    joinTestRoom(selectedTest.id);

    const unsubs = [
      onParticipantEvent((data) => {
        if (data.event.type === 'click') {
          setLiveClicks(prev => prev + 1);
          // Add to live heatmap
          setHeatmapData(prev => [...prev, {
            x: data.event.coordinates.x,
            y: data.event.coordinates.y,
            intensity: 1,
          }]);
        }
      }),
      onParticipantJoined(() => {
        setLiveParticipants(prev => prev + 1);
        toast.info('A participant joined the live session');
      }),
      onParticipantLeft(() => {
        setLiveParticipants(prev => Math.max(0, prev - 1));
        toast.info('A participant left the live session');
      }),
    ];

    return () => { unsubs.forEach(fn => fn()); };
  }, [selectedTest]);

  // If no test is selected, show error state
  if (!selectedTest) {
    return (
      <div className="empty-state-container">
        <div className="empty-state-content">
          <span className="icon"><span className="icon"><AlertTriangle size={48} className="mx-auto mb-4 textColorYellow500" /></span></span>
          <h2 className="h2  textColorBlack mb-2">No Test Selected</h2>
          <p className="textColorNeutral600 mb-6">Please select a test from the dashboard to view analytics.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 rounded-md bg-[var(--yellow500)] px-6 py-3 p-small  textColorBlack hover:bg-[var(--yellow500)]/90">
            <span className="icon"><span className="icon"><ArrowLeft size={16} /></span></span> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statsInteractions = analyticsData ? (analyticsData.confusion?.totalZones || 0) + liveClicks : liveClicks;
  const statsSessions = analyticsData?.totalSessions || 0;
  const statsAvgTime = analyticsData?.scrollDepth ? formatDuration(Math.round(analyticsData.scrollDepth.avgMaxDepth * 60)) : '0m 0s';
  const statsCompletion = analyticsData?.scrollDepth ? `${Math.round(analyticsData.scrollDepth.avgMaxDepth * 100)}%` : '0%';

  const handlePauseTest = () => { changeTestStatus(selectedTest.id, 'paused'); };
  const handleStopTest = () => { changeTestStatus(selectedTest.id, 'completed'); };

  const getStatusBadge = () => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      live: { label: 'Live', variant: 'live' },
      paused: { label: 'Paused', variant: 'default' },
      collecting: { label: 'Collecting', variant: 'live' },
      completed: { label: 'Completed', variant: 'default' },
      draft: { label: 'Draft', variant: 'default' },
    };
    const config = statusConfig[selectedTest.status] || statusConfig.draft;
    return <span className={`tag ${config.variant === "live" ? "tag--blue" : "tag--neutral"}`}>{config.label}</span>;
  };

  return (
    <div className="live-analytics-container">
      {/* Top Toolbar */}
      <header className="live-analytics-header">
        <div className="header-left">
          <button onClick={onBack} className="header-back-link">
            <span className="icon"><span className="icon"><ArrowLeft size={20} /></span></span>
            <span className="textColorBlack h3">miro</span>
          </button>
        </div>

        <div className="header-left">
          <div className="zoom-controls">
            <button onClick={handleZoomOut} className="zoom-btn"><span className="icon"><span className="icon"><Minus size={16} /></span></span></button>
            <span className="min-w-[48px] text-center p-small  textColorBlack">{zoom}%</span>
            <button onClick={handleZoomIn} className="zoom-btn"><span className="icon"><span className="icon"><Plus size={16} /></span></span></button>
          </div>
        </div>

        <div>
          <button
            onClick={() => toast.info('Beacon search: analyzing board elements...')}
            className="button button-primary header-action-btn"
          >
            <span className="icon"><span className="icon"><Search size={16} className="rotate-90" /></span></span> Beacon
          </button>
        </div>
      </header>

      <div className="live-analytics-content">
        {/* Left: Board Canvas */}
        <div className="live-analytics-board">
          <div className="board-wrapper">
            <div
              ref={boardRef}
              className="board-surface"
              style={{ height: `${boardHeight * zoom / 100}px`, width: `${boardWidth * zoom / 100}px`, transition: 'all 0.2s ease' }}
            >
              {/* Miro Live Embed */}
              <iframe
                className="board-iframe"
                src={`https://miro.com/app/live-embed/${((selectedTest as any)?.board as any)?.miroId ?? (selectedTest as any)?.board}/?embedAutoplay=true`}
                allowFullScreen
                title="Miro Live Embed"
              />

              {/* ── Real Heatmap Canvas Overlay ─────────────── */}
              {heatmapData.length > 0 && (
                <div className="heatmap-overlay-layer">
                  <HeatmapCanvas
                    data={heatmapData}
                    width={boardWidth * zoom / 100}
                    height={boardHeight * zoom / 100}
                    radius={Math.max(20, 40 * zoom / 100)}
                    opacity={0.55}
                  />
                </div>
              )}

              {/* ── AI Insight zones (shown when AI insights available) ── */}
              {showAiOnBoard && aiInsights.length > 0 && (
                (() => {
                  const coords = getPeakActivityCoords(heatmapData, boardWidth, boardHeight);
                  return (
                    <HeatmapZone
                      intensity="high"
                      className="ai-insight-zone"
                      style={{ top: `${coords.y}%`, left: `${coords.x}%` }}
                      insight={{
                        title: aiInsights[0]?.insights.patterns[0] || 'High Activity Zone',
                        cause: aiInsights[0]?.insights.summary || 'Real data analysis',
                        remedy: aiInsights[0]?.insights.recommendations[0] || 'See full insights in AI tab',
                      }}
                    />
                  );
                })()
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Analytics Panel */}
        <div className="live-analytics-sidebar">
          {/* Panel Header */}
          <div className="sidebar-header">
            <h2 className="p-large  textColorBlack">{selectedTest.name}</h2>
            <div className="sidebar-header-row">
              <div className="sidebar-header-stats">
                {getStatusBadge()}
                <span className="p-small textColorNeutral600">{liveParticipants} participants</span>
              </div>
              <div className="sidebar-header-actions">
                <button onClick={() => toast.info('Test settings — feature coming soon')} className="hover:textColorBlack" title="Test Settings"><span className="icon"><span className="icon"><Settings size={20} /></span></span></button>
                {(selectedTest.status === 'live' || selectedTest.status === 'collecting') && (
                  <button onClick={handlePauseTest} className="hover:textColorBlack"><span className="icon"><span className="icon"><Pause size={20} /></span></span></button>
                )}
                {(selectedTest.status === 'live' || selectedTest.status === 'collecting' || selectedTest.status === 'paused') && (
                  <button onClick={handleStopTest} className="hover:textColorBlack textColorBlack"><span className="icon"><span className="icon"><Square size={20} fill="currentColor" /></span></span></button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="sidebar-tabs-container">
            <div className="flex gap-6">
              {['Overview', 'Heatmap', 'Flow', 'AI Insights'].map((tab) => {
                const id = tab.toLowerCase().split(' ')[0] as any;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(id)}
                    className={cn("py-3 p-small  transition-colors border-b-2",
                      activeTab === id ? "border-[var(--blue500)] textColorBlue500" : "border-transparent textColorNeutral600 hover:textColorBlack"
                    )}
                  >
                    {tab === 'AI Insights' && <span className="icon"><span className="icon"><Lightbulb size={14} className="inline mr-1 mb-0.5" /></span></span>}
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="sidebar-content-scroll">

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
              <div className="sidebar-tab-content">
                {analyticsLoading ? (
                  <div className="loading-indicator">
                    <span className="icon"><span className="icon"><Loader2 size={24} className="animate-spin textColorBlue500" /></span></span>
                    <span className="ml-2 p-small textColorNeutral600">Loading analytics...</span>
                  </div>
                ) : (
                  <>
                    {/* Quick Stats Grid */}
                    <div className="grid">
                      {selectedTest.type === 'live-session' ? (
                        <>
                          <div className="cs1 ce6 bg-[var(--neutral100)] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="h1  textColorBlack">{liveParticipants}</span>
                              <span className="icon"><span className="icon"><Users size={16} className="textColorBlue500" /></span></span>
                            </div>
                            <span className="p-xsmall textColorNeutral600 mt-1 block">Live Participants</span>
                          </div>
                          <div className="cs1 ce6 bg-[var(--neutral100)] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="h1  textColorBlack">{liveClicks}</span>
                              <span className="icon"><span className="icon"><MousePointer2 size={16} className="textColorBlue500" /></span></span>
                            </div>
                            <span className="p-xsmall textColorNeutral600 mt-1 block">Live Clicks</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="cs1 ce6 bg-[var(--neutral100)] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="h1  textColorBlack">{statsSessions}</span>
                              <span className="icon"><span className="icon"><Users size={16} className="textColorBlue500" /></span></span>
                            </div>
                            <span className="p-xsmall textColorNeutral600 mt-1 block">Total Sessions</span>
                          </div>
                          <div className="cs1 ce6 bg-[var(--neutral100)] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="h1  textColorBlack">{statsAvgTime}</span>
                              <span className="icon"><span className="icon"><Clock size={16} className="textColorBlue500" /></span></span>
                            </div>
                            <span className="p-xsmall textColorNeutral600 mt-1 block">Avg. Session Time</span>
                          </div>
                          <div className="cs1 ce6 bg-[var(--neutral100)] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="h1  textColorBlack">{statsCompletion}</span>
                              <span className="icon"><span className="icon"><CheckCircle size={16} className="textColorBlue500" /></span></span>
                            </div>
                            <span className="p-xsmall textColorNeutral600 mt-1 block">Completion Rate</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Session Info */}
                    <div>
                      <h3 className="p-medium  textColorBlack mb-3">Session Overview</h3>
                      <div className="info-box">
                        <div className="info-row">
                          <span className="textColorNeutral600">Total Sessions:</span>
                          <span className="textColorBlack">{statsSessions}</span>
                        </div>
                        <div className="info-row">
                          <span className="textColorNeutral600">Participants:</span>
                          <span className="textColorBlack">{selectedTest.participants.current} / {selectedTest.participants.target}</span>
                        </div>
                        <div className="info-row">
                          <span className="textColorNeutral600">Type:</span>
                          <span className="textColorBlack capitalize">{selectedTest.type.replace('-', ' ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* First-Click Analysis */}
                    <div>
                      <div className="section-title-row">
                        <h3 className="p-medium  textColorBlack">Element Analysis</h3>
                        <span className="icon"><span className="icon"><Info size={14} className="textColorNeutral600" /></span></span>
                      </div>
                      {firstClickData.length > 0 ? (
                        <div style={{ height: "192px", width: "100%" }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={firstClickData} margin={{ left: 0, right: 30 }}>
                              <XAxis type="number" hide />
                              <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#050038' }} axisLine={false} tickLine={false} />
                              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(5,0,56,0.1)' }} />
                              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                {firstClickData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="empty-state-box">
                          <p className="p-small textColorNeutral600">No interaction data yet. Start a test session to collect data.</p>
                        </div>
                      )}
                    </div>

                    {/* Confusion Zones */}
                    {analyticsData?.confusion && analyticsData.confusion.zones.length > 0 && (
                      <div>
                        <div className="section-title-row">
                          <h3 className="p-medium  textColorBlack">Confusion Zones</h3>
                          <span className="icon"><span className="icon"><AlertTriangle size={16} className="textColorYellow500" /></span></span>
                        </div>
                        {analyticsData.confusion.zones.map((zone, i) => (
                          <div key={i} className="confusion-zone-card">
                            <p className="textColorBlack">{zone.element}: {zone.description}</p>
                            <p className="p-xsmall textColorNeutral800 mt-1">Confusion score: {zone.score ? zone.score.toFixed(2) : '0.00'}</p>
                            <button
                              onClick={() => setHighlightZone(!highlightZone)}
                              className="mt-3 p-small  textColorBlack underline decoration-[#ffd02f] hover:textColorNeutral800"
                            >
                              {highlightZone ? "Hide on board" : "Highlight on board"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Simulation CTA */}
                    {statsSessions === 0 && selectedTest.type !== 'live-session' && (
                      <div className="bg-[var(--blue500)]/5 border border-[var(--blue500)]/20 p-6 rounded-xl text-center mt-6">
                        <span className="icon"><span className="icon"><Layers size={32} className="mx-auto mb-4 textColorBlue500" /></span></span>
                        <h3 className="p-medium  textColorBlack mb-2">No data recorded yet</h3>
                        <p className="p-small textColorNeutral600 mb-4">
                          Testing your prototype? Simulate random playthroughs to see how beacon generates heatmaps and AI insights.
                        </p>
                        <Button
                          onClick={async () => {
                            try {
                              toast.loading('Simulating sessions...', { id: 'sim' });
                              await api.simulateTest(selectedTest.id, 5);
                              toast.success('Simulation complete!', { id: 'sim' });
                              fetchAnalytics();
                            } catch (e) {
                              toast.error('Failed to simulate sessions', { id: 'sim' });
                            }
                          }}
                        >
                          Simulate 5 Playthroughs
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ═══ AI INSIGHTS TAB ═══ */}
            {activeTab === 'ai' && (
              <div className="sidebar-tab-content">
                {/* Generate Button */}
                <button type="button" onClick={handleGenerateInsights} disabled={aiLoading} className="button button-primary w-full">
                  {aiLoading ? (
                    <><span className="icon"><span className="icon"><Loader2 size={14} className="mr-2 animate-spin" /></span></span> Generating insights...</>
                  ) : (
                    <><span className="icon"><span className="icon"><Lightbulb size={14} className="mr-2" /></span></span> Generate AI Insights</>
                  )}
                </button>

                {aiLoading ? (
                  <div className="ai-loading-container">
                    <div className="ai-loading-card">
                      <div className="card-header-row">
                        <div className="skeleton-avatar"></div>
                        <div className="skeleton-line-small"></div>
                      </div>
                      <div className="skeleton-line-full"></div>
                      <div className="skeleton-line-3-4"></div>
                      <div className="skeleton-line-med"></div>
                      <div className="skeleton-block">
                        <div className="skeleton-line-5-6"></div>
                        <div className="skeleton-line-4-6"></div>
                      </div>
                      <div className="skeleton-pill"></div>
                    </div>
                  </div>
                ) : aiError ? (
                  <div className="ai-error-box">
                    <span className="icon"><span className="icon"><AlertTriangle size={32} className="ai-error-icon" /></span></span>
                    <h3 className="ai-error-title">Analysis failed to generate</h3>
                    <p className="ai-error-msg">{aiError}</p>
                    <button type="button" onClick={handleGenerateInsights} className="button button-secondary ai-error-btn">
                      <span className="icon"><span className="icon"><RefreshCw size={14} className="mr-2" /></span></span> Retry Analysis
                    </button>
                  </div>
                ) : aiInsights.length === 0 ? (
                  <div className="empty-state-box large">
                    <span className="icon"><span className="icon"><Lightbulb size={32} className="mx-auto mb-4 textColorYellow500" /></span></span>
                    <h3 className="p-medium  textColorBlack mb-2">No insights yet</h3>
                    <p className="p-small textColorNeutral600">
                      Click"Generate AI Insights" to analyze your test sessions.
                      The AI will review participant behavior and provide actionable recommendations.
                    </p>
                  </div>
                ) : null}

                {/* Real insight cards */}
                {aiInsights.map((insight, idx) => (
                  <div key={insight._id || idx} className="ai-insight-card">
                    <div className="card-header-row">
                      <span className="icon"><span className="icon"><Lightbulb className="textColorYellow500 flex-shrink-0" size={24} /></span></span>
                      <div className="sidebar-header-stats">
                        <span className="p-xsmall font-mono textColorNeutral400">{insight.provider}</span>
                        {insight.cost > 0 && (
                          <span className="p-xsmall textColorNeutral400">${insight.cost.toFixed(4)}</span>
                        )}
                      </div>
                    </div>
                    <p className="p-small textColorNeutral700 leading-relaxed mb-4">{insight.insights.summary}</p>
                    {insight.insights.patterns.length > 0 && (
                      <div className="mb-16px">
                        <span className="p-xsmall  textColorNeutral600 block mb-2">Patterns detected:</span>
                        <ul className="p-small textColorNeutral700 space-y-1 list-disc pl-4">
                          {insight.insights.patterns.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {insight.insights.recommendations.length > 0 && (
                      <div className="mb-16px">
                        <span className="p-xsmall  textColorNeutral600 block mb-2">Recommendations:</span>
                        <ul className="p-small textColorNeutral700 space-y-1 list-disc pl-4">
                          {insight.insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <span className={cn("px-2 py-0.5 rounded-full p-xsmall",
                        insight.insights.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                          insight.insights.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                      )}>
                        {insight.insights.sentiment}
                      </span>
                      <span className="p-xsmall textColorNeutral400">
                        {new Date(insight.generatedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setShowAiOnBoard(!showAiOnBoard); toast.info(showAiOnBoard ? 'Insight hidden from board' : 'Insight shown on board'); }}
                      >
                        {showAiOnBoard ? 'Hide from board' : 'Show on board'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ═══ HEATMAP TAB ═══ */}
            {activeTab === 'heatmap' && (
              <div className="sidebar-tab-content">
                <Button
                  onClick={handleGenerateHeatmap}
                  disabled={heatmapLoading}
                  variant="secondary"
                  className="w-full justify-center"
                >
                  {heatmapLoading ? (
                    <><span className="icon"><span className="icon"><Loader2 size={14} className="mr-2 animate-spin" /></span></span> Generating...</>
                  ) : (
                    <><span className="icon"><span className="icon"><RefreshCw size={14} className="mr-2" /></span></span> Generate Heatmap from Sessions</>
                  )}
                </Button>

                <div>
                  <h3 className="p-medium  textColorBlack mb-3">Heatmap Legend</h3>
                  <div className="heatmap-legend-row">
                    <div className="sidebar-header-stats">
                      <div className="legend-dot red" />
                      <span className="p-xsmall textColorNeutral600">High activity</span>
                    </div>
                    <div className="sidebar-header-stats">
                      <div className="legend-dot yellow" />
                      <span className="p-xsmall textColorNeutral600">Medium</span>
                    </div>
                    <div className="sidebar-header-stats">
                      <div className="legend-dot blue" />
                      <span className="p-xsmall textColorNeutral600">Low</span>
                    </div>
                  </div>
                  <div className="h-4 w-full rounded-full bg-gradient-to-r from-[#4262ff] via-[#00ff88] via-[#ffd02f] to-[#ef4444] mb-2" />
                  <div className="flex justify-between text-[10px] textColorNeutral400">
                    <span>Low</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <h3 className="p-medium  textColorBlack mb-3">Click Distribution</h3>
                  {clickDistribution.length > 0 ? (
                    <div className="space-y-3">
                      {clickDistribution.map((item) => (
                        <div key={item.element} className="bg-[var(--neutral100)] p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="p-small  textColorBlack">{item.element}</span>
                            <span className="p-small  textColorBlack">{item.clicks} clicks ({item.pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-[var(--neutral900)]/10">
                            <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state-box">
                      <p className="p-small textColorNeutral600">No click data yet. Generate a heatmap to see distribution.</p>
                    </div>
                  )}
                </div>

                {heatmapData.length === 0 ? (
                  <div className="empty-state-box large">
                    <span className="icon"><span className="icon"><Layers size={32} className="mx-auto mb-4 textColorYellow500" /></span></span>
                    <h3 className="p-medium  textColorBlack mb-2">No heatmap generated yet</h3>
                    <p className="p-small textColorNeutral600">
                      Start a session or click 'Generate Heatmap' to analyze historical data.
                    </p>
                  </div>
                ) : (
                  <div className="cs1 ce6 bg-[var(--neutral100)] p-4 rounded-lg">
                    <p className="p-xsmall textColorNeutral600">
                      <span className="icon"><span className="icon"><Info size={12} className="inline mr-1" /></span></span>
                      Showing {heatmapData.length} data points on the board canvas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ FLOW TAB ═══ */}
            {activeTab === 'flow' && (
              <div className="sidebar-tab-content">
                <div>
                  <h3 className="p-medium  textColorBlack mb-3">Task Flow Analysis</h3>
                  <p className="p-small textColorNeutral600 mb-4">User navigation paths through the prototype</p>
                </div>

                {flowLoading ? (
                  <div className="loading-indicator">
                    <span className="icon"><span className="icon"><Loader2 size={24} className="animate-spin textColorBlue500" /></span></span>
                    <span className="ml-2 p-small textColorNeutral600">Loading flow data...</span>
                  </div>
                ) : flowData.length > 0 ? (
                  <div className="space-y-3">
                    {flowData.map((flow, i) => (
                      <div key={i}>
                        <div className="flow-item">
                          <div className="flow-bar-container">
                            <div className="flow-bar-header">
                              <span className="p-small  textColorBlack">{flow.path.join(' → ')}</span>
                              <span className="p-small  textColorBlue500">{flow.percentage}%</span>
                            </div>
                            <div className="flow-bar-track">
                              <div className="h-full rounded-full bg-[var(--blue500)] transition-all" style={{ width: `${flow.percentage}%` }} />
                            </div>
                            <span className="p-xsmall textColorNeutral400 mt-1 block">{flow.count} sessions</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state-box large">
                    <span className="icon"><span className="icon"><Layers size={32} className="mx-auto mb-4 textColorBlue500" /></span></span>
                    <h3 className="p-medium  textColorBlack mb-2">No flow data yet</h3>
                    <p className="p-small textColorNeutral600">
                      Flow analysis will appear after participants complete test sessions.
                    </p>
                  </div>
                )}

                <div className="cs1 ce6 bg-[var(--neutral100)] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="icon"><span className="icon"><Target size={14} className="textColorBlue500" /></span></span>
                    <span className="p-small  textColorBlack">Key Insight</span>
                  </div>
                  <p className="p-small textColorNeutral700">
                    {flowData.length > 0
                      ? `Most common path: ${flowData[0].path.join(' → ')} (${flowData[0].percentage}% of users)`
                      : 'Run test sessions to discover navigation patterns and drop-off points.'
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Helper ──────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function getPeakActivityCoords(data: { x: number; y: number; intensity: number }[], width: number, height: number): { x: number; y: number } {
  if (!data || data.length === 0) return { x: 50, y: 50 };

  const gridSize = 40;
  const grid: Record<string, number> = {};

  for (const point of data) {
    const col = Math.floor(point.x / gridSize);
    const row = Math.floor(point.y / gridSize);
    const key = `${col},${row}`;
    grid[key] = (grid[key] || 0) + point.intensity;
  }

  let maxKey = '';
  let maxVal = -1;
  for (const key in grid) {
    if (grid[key] > maxVal) {
      maxVal = grid[key];
      maxKey = key;
    }
  }

  if (!maxKey) return { x: 50, y: 50 };

  const [col, row] = maxKey.split(',').map(Number);
  const centerX = (col * gridSize) + (gridSize / 2);
  const centerY = (row * gridSize) + (gridSize / 2);

  const posX = Math.min(100, Math.max(0, (centerX / width) * 100));
  const posY = Math.min(100, Math.max(0, (centerY / height) * 100));

  return { x: posX, y: posY };
}

// ── Icon components (lucide-react doesn't export some) ─────
const CheckCircle = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const Clock = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const Users = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
