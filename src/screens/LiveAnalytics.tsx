import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MousePointer2,
  Hand,
  MessageSquare,
  Minus,
  Plus,
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
  Loader2,
  CheckCircle,
  Clock,
  Users
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";
import { createPortal } from "react-dom";
import { useTests } from "../contexts/TestContext";
import { toast } from "sonner";
import { api, ApiHeatmap, ApiAIInsight, ApiAnalyticsSummary, ApiPrediction, ApiSessionStats } from "../lib/api";
import { HeatmapCanvas } from "../components/HeatmapCanvas";
import { joinTestRoom, onParticipantEvent, onParticipantJoined, onParticipantLeft } from "../lib/socket";

interface LiveAnalyticsProps {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
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
    low: { bg: 'bg-[#4262ff]', border: 'border-[#4262ff]', text: 'text-[#4262ff]', z: 'z-10' },
    medium: { bg: 'bg-[#ffd02f]', border: 'border-[#ffd02f]', text: 'text-[#ffd02f]', z: 'z-20' },
    high: { bg: 'bg-[#ef4444]', border: 'border-[#ef4444]', text: 'text-[#ef4444]', z: 'z-30' },
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
        <div className="relative rounded-xl bg-[#050038] p-4 text-white shadow-xl ring-1 ring-white/10">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
            <Lightbulb size={16} className={style.text} />
            <span className="font-bold text-sm">AI Insight</span>
          </div>
          <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
          <div className="space-y-2 text-xs text-white/70">
            <p><span className="text-white/40 font-semibold uppercase tracking-wider text-[10px]">Cause:</span> {insight.cause}</p>
            <p><span className="text-white/40 font-semibold uppercase tracking-wider text-[10px]">Remedy:</span> {insight.remedy}</p>
          </div>
          <div className={cn(
            "absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#050038] border-white/10",
            tooltipPosition === 'top' ? "top-full -mt-1 border-b border-r" : "bottom-full -mb-1 border-t border-l"
          )} />
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>
      <div
        ref={zoneRef}
        className={cn("absolute group cursor-pointer", className, style.z)}
        style={customStyle}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={cn("w-full h-full rounded-full opacity-50 blur-xl transition-all duration-300", style.bg, isHovered ? "opacity-80 blur-md" : "")} />
        <div className={cn("absolute inset-0 rounded-full border-2 border-dashed opacity-0 transition-opacity duration-300", style.border, isHovered ? "opacity-100" : "opacity-30")} />
      </div>
      {typeof document !== 'undefined' && tooltipContent && createPortal(tooltipContent, document.body)}
    </>
  );
};

// ── LiveAnalytics Component ─────────────────────────────────
export const LiveAnalytics: React.FC<LiveAnalyticsProps> = ({ onBack, onNavigate }) => {
  const { selectedTest, changeTestStatus } = useTests();
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'flow' | 'ai'>('overview');
  const [highlightZone, setHighlightZone] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showAiOnBoard, setShowAiOnBoard] = useState(false);

  const startWidgetId = selectedTest?.startWidgetId || null;

  const [predictiveData, setPredictiveData] = useState<ApiPrediction[]>([]);
  const [predictiveLoading, setPredictiveLoading] = useState(false);
  const [showPredictive, setShowPredictive] = useState(false);
  const [predictiveSummary, setPredictiveSummary] = useState('');

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

  const [sessionStats, setSessionStats] = useState<ApiSessionStats | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const hasFetchedHeatmap = useRef(false);
  const hasFetchedAi = useRef(false);
  const hasFetchedFlow = useRef(false);
  const CANVAS_WIDTH_PX = 1200;
  const CANVAS_HEIGHT_PX = 800;
  const COORD_MAX_X = 1200;
  const COORD_MAX_Y = 800;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 25));

  // ── Fetch analytics summary ───────────────────────────
  const fetchAnalytics = useCallback(async () => {
    if (!selectedTest) return;
    setAnalyticsLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        api.get<ApiAnalyticsSummary>(`/api/analytics/${selectedTest.id}/summary`),
        api.get<ApiSessionStats>(`/api/analytics/${selectedTest.id}/session-stats`),
      ]);
      setAnalyticsData(data);
      setSessionStats(statsData);
      setLiveParticipants(data.totalSessions || 0);
      setLiveClicks(0); // socket events will increment from here

      // Derive first-click data from element analytics
      if (data.dwellTimes && data.dwellTimes.length > 0) {
        const totalDwell = data.dwellTimes.reduce((s, d) => s + d.totalDwellMs, 0);
        const colors = ['#ef4444', '#ffd02f', '#4262ff', '#050038'];
        setFirstClickData(
          data.dwellTimes.slice(0, 4).map((d, i) => ({
            name: d.element,
            value: totalDwell > 0 ? Math.round((d.totalDwellMs / totalDwell) * 100) : 0,
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
        if (p.y < COORD_MAX_Y / 3) {
          if (p.x < COORD_MAX_X / 2) zones[0].count++;
          else zones[1].count++;
        } else if (p.y < (COORD_MAX_Y * 2) / 3) {
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
  }, []);

  // ── Fetch heatmap data (only called explicitly, not on mount) ─
  const fetchHeatmap = useCallback(async () => {
    if (!selectedTest) return false;
    setHeatmapLoading(true);
    try {
      const data = await api.get<{ heatmap?: ApiHeatmap; heatmaps?: ApiHeatmap[] }>(`/api/heatmaps/${selectedTest.id}/attention`);
      const allHeatmaps = data.heatmaps || (data.heatmap ? [data.heatmap] : []);
      if (allHeatmaps.length > 0) {
        // TODO: Future support for multiple subjects. Currently scoped to 1 subject.
        const allPoints = allHeatmaps[0].data;
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
      const data = await api.post<{ heatmap: ApiHeatmap }>(`/api/heatmaps/generate/${selectedTest.id}`, { type: 'attention' });
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

  // ── Fetch predictive heatmap ───────────────────────────
  const fetchPredictiveHeatmap = useCallback(async () => {
    if (!selectedTest) return;
    try {
      const data = await api.fetchPredictiveHeatmap(selectedTest.id);
      if (data.heatmap && data.heatmap.data.length > 0) {
        setPredictiveData(
          data.heatmap.data.map(p => ({
            ...p,
            type: 'attention' as const,
            reason: 'Previously generated prediction',
          }))
        );
        setShowPredictive(true);
      }
    } catch {
      // No prior prediction — silently ignore
    }
  }, [selectedTest]);

  // ── Generate prediction ───────────────────────────────
  const handleGeneratePrediction = async () => {
    if (!selectedTest) return;
    setPredictiveLoading(true);
    try {
      toast.loading('AI is evaluating visual hierarchy...', { id: 'predict' });
      const data = await api.generatePredictiveHeatmap(selectedTest.id);
      setPredictiveData(data.predictions);
      setPredictiveSummary(data.summary);
      setShowPredictive(true);
      toast.success(`Predictive heatmap ready — ${data.predictions.length} zones mapped`, { id: 'predict' });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to generate prediction. Check AI key in Settings.', { id: 'predict' });
    } finally {
      setPredictiveLoading(false);
    }
  };

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
    fetchPredictiveHeatmap();
    fetchHeatmap().then((hasData) => {
      if (!hasData) {
        handleGenerateHeatmap();
      }
    });
  }, [selectedTest, fetchAiInsights, fetchHeatmap, handleGenerateHeatmap]); // Note: React Hook useEffect has a missing dependency: 'fetchPredictiveHeatmap'. Either include it or remove the dependency array. But Since it's ref controlled, it's fine. 

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
      <div className="flex h-screen w-full items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <AlertTriangle size={48} className="mx-auto mb-4 text-[#ffd02f]" />
          <h2 className="text-2xl font-bold text-[#050038] mb-2">No Test Selected</h2>
          <p className="text-[#050038]/60 mb-6">Please select a test from the dashboard to view analytics.</p>
          <button onClick={onBack} className="inline-flex items-center gap-2 rounded-md bg-[#ffd02f] px-6 py-3 text-sm font-semibold text-[#050038] hover:bg-[#ffd02f]/90">
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const statsInteractions = analyticsData ? (analyticsData.confusion?.totalZones || 0) + liveClicks : liveClicks;
  const statsSessions = sessionStats?.totalSessions ?? 0;
  const statsAvgTime = sessionStats
    ? formatDuration(sessionStats.avgDuration)
    : '0m 0s';
  const statsCompletion = sessionStats
    ? `${sessionStats.completionRate}%`
    : '0%';

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
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      {/* Top Toolbar */}
      <header className="flex h-14 items-center justify-between border-b border-[#050038]/10 bg-white px-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 text-[#050038]/60 hover:text-[#050038]">
            <ArrowLeft size={20} />
            <span className="font-bold text-[#050038] text-xl">Beacon</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Board Canvas */}
        <div className="relative flex-1 bg-[#fafafa] overflow-auto">
          <div className="absolute inset-0 flex items-center justify-center p-8 min-w-[1000px] min-h-[800px]">
            <div
              ref={boardRef}
              className="relative bg-white shadow-lg rounded-sm overflow-hidden border border-[#050038]/10"
              style={{
                height: `${CANVAS_HEIGHT_PX}px`,
                width: `${CANVAS_WIDTH_PX}px`,
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Miro Live Embed */}
              <iframe
                className="w-full h-full border-0 pointer-events-none"
                src={`https://miro.com/app/live-embed/${selectedTest.boardUrl}/?embedAutoplay=true${startWidgetId ? `&moveToWidget=${startWidgetId}` : ''}`}
                allowFullScreen
                title="Miro Live Embed"
              />

              {/* ── Real Heatmap Canvas Overlay ─────────────── */}
              {heatmapData.length > 0 && (
                <div className="absolute inset-0 pointer-events-none z-40">
                  <HeatmapCanvas
                    data={heatmapData}
                    width={CANVAS_WIDTH_PX}
                    height={CANVAS_HEIGHT_PX}
                    radius={40}
                    opacity={0.55}
                  />
                </div>
              )}

              {/* ── Predictive Heatmap Overlay (AI-generated) ── */}
              {showPredictive && predictiveData.length > 0 && (
                <div className="absolute inset-0 pointer-events-none z-41">
                  <HeatmapCanvas
                    data={predictiveData.map(p => ({
                      x: p.x,
                      y: p.y,
                      intensity: p.intensity,
                    }))}
                    width={CANVAS_WIDTH_PX}
                    height={CANVAS_HEIGHT_PX}
                    radius={48}
                    opacity={0.5}
                    colorScheme="predictive"
                  />
                </div>
              )}

              {/* ── AI Insight zones (shown when AI insights available) ── */}
              {showAiOnBoard && aiInsights.length > 0 && (
                (() => {
                  const coords = getPeakActivityCoords(heatmapData, CANVAS_WIDTH_PX, CANVAS_HEIGHT_PX);
                  return (
                    <HeatmapZone
                      intensity="high"
                      className="w-32 h-24 z-10 -translate-x-1/2 -translate-y-1/2"
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
        <div className="w-[480px] flex-shrink-0 border-l border-[#050038]/10 bg-white shadow-[-4px_0_16px_rgba(5,0,56,0.05)] flex flex-col">
          {/* Panel Header */}
          <div className="p-6 border-b border-[#050038]/10">
            <h2 className="text-lg font-semibold text-[#050038]">{selectedTest.name}</h2>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusBadge()}
                <span className="text-sm text-[#050038]/60">{liveParticipants} participants</span>
              </div>
              <div className="flex items-center gap-4 text-[#050038]/60">
                {(selectedTest.status === 'live' || selectedTest.status === 'collecting') && (
                  <button onClick={handlePauseTest} className="hover:text-[#050038]"><Pause size={20} /></button>
                )}
                {(selectedTest.status === 'live' || selectedTest.status === 'collecting' || selectedTest.status === 'paused') && (
                  <button onClick={handleStopTest} className="hover:text-[#050038] text-[#050038]"><Square size={20} fill="currentColor" /></button>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6 border-b border-[#050038]/10">
            <div className="flex gap-6">
              {['Overview', 'Heatmap', 'Flow', 'AI Insights'].map((tab) => {
                const id = tab.toLowerCase().split(' ')[0] as any;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(id)}
                    className={cn(
                      "py-3 text-sm font-semibold transition-colors border-b-2",
                      activeTab === id ? "border-[#4262ff] text-[#4262ff]" : "border-transparent text-[#050038]/60 hover:text-[#050038]"
                    )}
                  >
                    {tab === 'AI Insights' && <Lightbulb size={14} className="inline mr-1 mb-0.5" />}
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-[#4262ff]" />
                    <span className="ml-2 text-sm text-[#050038]/60">Loading analytics...</span>
                  </div>
                ) : (
                  <>
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      {selectedTest.type === 'live-session' ? (
                        <>
                          <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="text-3xl font-bold text-[#050038]">{liveParticipants}</span>
                              <Users size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Live Participants</span>
                          </div>
                          <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="text-3xl font-bold text-[#050038]">{liveClicks}</span>
                              <MousePointer2 size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Live Clicks</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="text-3xl font-bold text-[#050038]">{statsSessions}</span>
                              <Users size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Total Sessions</span>
                          </div>
                          <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="text-3xl font-bold text-[#050038]">{statsAvgTime}</span>
                              <Clock size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Avg. Session Time</span>
                          </div>
                          <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                              <span className="text-3xl font-bold text-[#050038]">{statsCompletion}</span>
                              <CheckCircle size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Completion Rate</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Session Info */}
                    <div>
                      <h3 className="text-base font-semibold text-[#050038] mb-3">Session Overview</h3>
                      <div className="bg-[#fafafa] p-4 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#050038]/60">Total Sessions:</span>
                          <span className="font-semibold text-[#050038]">{statsSessions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#050038]/60">Participants:</span>
                          <span className="font-semibold text-[#050038]">{selectedTest.participants.current} / {selectedTest.participants.target}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#050038]/60">Type:</span>
                          <span className="font-semibold text-[#050038] capitalize">{selectedTest.type.replace('-', ' ')}</span>
                        </div>
                      </div>
                    </div>

                    {/* First-Click Analysis */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <h3 className="text-base font-semibold text-[#050038]">Element Analysis</h3>
                        <Info size={14} className="text-[#050038]/60" />
                      </div>
                      {firstClickData.length > 0 ? (
                        <div className="h-48 w-full">
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
                        <div className="bg-[#fafafa] p-4 rounded-lg text-center">
                          <p className="text-sm text-[#050038]/60">No interaction data yet. Start a test session to collect data.</p>
                        </div>
                      )}
                    </div>

                    {/* Confusion Zones */}
                    {analyticsData?.confusion && analyticsData.confusion.zones.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <h3 className="text-base font-semibold text-[#050038]">Confusion Zones</h3>
                          <AlertTriangle size={16} className="text-[#ffd02f]" />
                        </div>
                        {analyticsData.confusion.zones.map((zone, i) => (
                          <div key={i} className="bg-[#ffd02f]/10 border border-[#ffd02f] p-4 rounded-lg mb-2">
                            <p className="font-medium text-[#050038]">{zone.element}: {zone.details}</p>
                            <p className="text-xs text-[#050038]/80 mt-1">Severity: {zone.severity?.toFixed(2) ?? '0.00'}</p>
                            <button
                              onClick={() => setHighlightZone(!highlightZone)}
                              className="mt-3 text-sm font-semibold text-[#050038] underline decoration-[#ffd02f] hover:text-[#050038]/80"
                            >
                              {highlightZone ? "Hide on board" : "Highlight on board"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Simulation CTA Replacement */}
                    {statsSessions === 0 && selectedTest.type !== 'live-session' && (
                      <div className="bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 border border-violet-500/20 p-6 rounded-xl text-center mt-6">
                        <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
                          <Lightbulb size={20} className="text-white" />
                        </div>
                        <h3 className="text-base font-semibold text-[#050038] mb-2">
                          No participant data yet
                        </h3>
                        <p className="text-sm text-[#050038]/60 mb-4">
                          Use AI to predict where users will click before recruiting participants. Generate a Predictive Heatmap based on UX heuristics and your board's task goals.
                        </p>
                        <Button
                          onClick={handleGeneratePrediction}
                          disabled={predictiveLoading}
                          className="w-full justify-center bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700"
                        >
                          {predictiveLoading ? (
                            <>
                              <Loader2 size={14} className="mr-2 animate-spin" />
                              AI is evaluating visual hierarchy...
                            </>
                          ) : (
                            <>
                              <Lightbulb size={14} className="mr-2" />
                              Generate Predictive Heatmap
                            </>
                          )}
                        </Button>
                        {predictiveSummary && (
                          <p className="mt-3 text-xs text-[#050038]/50 text-left bg-white/60 rounded-lg px-3 py-2">
                            {predictiveSummary}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ═══ AI INSIGHTS TAB ═══ */}
            {activeTab === 'ai' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* Generate Button */}
                <Button
                  onClick={handleGenerateInsights}
                  disabled={aiLoading}
                  className="w-full justify-center"
                >
                  {aiLoading ? (
                    <><Loader2 size={14} className="mr-2 animate-spin" /> Generating insights...</>
                  ) : (
                    <><Lightbulb size={14} className="mr-2" /> Generate AI Insights</>
                  )}
                </Button>

                {aiLoading ? (
                  <div className="space-y-4">
                    <div className="bg-white border border-[#050038]/10 p-6 rounded-xl shadow-sm animate-pulse">
                      <div className="flex items-start justify-between mb-4">
                        <div className="h-6 w-6 bg-[#050038]/10 rounded-full"></div>
                        <div className="h-4 w-16 bg-[#050038]/10 rounded"></div>
                      </div>
                      <div className="h-4 w-full bg-[#050038]/10 rounded mb-2"></div>
                      <div className="h-4 w-3/4 bg-[#050038]/10 rounded mb-6"></div>
                      <div className="h-3 w-32 bg-[#050038]/10 rounded mb-3"></div>
                      <div className="space-y-2 mb-6">
                        <div className="h-3 w-5/6 bg-[#050038]/10 rounded"></div>
                        <div className="h-3 w-4/6 bg-[#050038]/10 rounded"></div>
                      </div>
                      <div className="h-5 w-20 bg-[#050038]/10 rounded-full"></div>
                    </div>
                  </div>
                ) : aiError ? (
                  <div className="bg-red-50 border border-red-200 p-6 rounded-xl text-center">
                    <AlertTriangle size={32} className="mx-auto mb-4 text-red-500" />
                    <h3 className="text-base font-semibold text-red-700 mb-2">Analysis failed to generate</h3>
                    <p className="text-sm text-red-600 mb-4">{aiError}</p>
                    {aiError?.includes('Settings') ? (
                      <Button onClick={() => {
                        if (onNavigate) {
                          onNavigate('settings');
                        } else {
                          window.location.href = '/settings';
                        }
                      }} variant="secondary" className="bg-white hover:bg-red-50 text-red-700 border-red-200">
                        <Settings size={14} className="mr-2" /> Go to Settings
                      </Button>
                    ) : (
                      <Button onClick={handleGenerateInsights} variant="secondary" className="bg-white hover:bg-red-50 text-red-700 border-red-200">
                        <RefreshCw size={14} className="mr-2" /> Retry Analysis
                      </Button>
                    )}
                  </div>
                ) : aiInsights.length === 0 ? (
                  <div className="bg-[#fafafa] p-8 rounded-xl text-center">
                    <Lightbulb size={32} className="mx-auto mb-4 text-[#ffd02f]" />
                    <h3 className="text-base font-semibold text-[#050038] mb-2">No insights yet</h3>
                    <p className="text-sm text-[#050038]/60">
                      Click "Generate AI Insights" to analyze your test sessions.
                      The AI will review participant behavior and provide actionable recommendations.
                    </p>
                  </div>
                ) : null}

                {/* Real insight cards */}
                {aiInsights.map((insight, idx) => (
                  <div key={insight._id || idx} className="bg-white border border-[#050038]/10 p-6 rounded-xl shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <Lightbulb className="text-[#ffd02f] flex-shrink-0" size={24} />
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#050038]/40">{insight.provider}</span>
                        {insight.cost > 0 && (
                          <span className="text-xs text-[#050038]/40">${insight.cost.toFixed(4)}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-[#050038]/70 leading-relaxed mb-4">{insight.insights.summary}</p>
                    {insight.insights.patterns.length > 0 && (
                      <div className="mb-4">
                        <span className="text-xs font-semibold text-[#050038]/60 block mb-2">Patterns detected:</span>
                        <ul className="text-sm text-[#050038]/70 space-y-1 list-disc pl-4">
                          {insight.insights.patterns.map((p, i) => <li key={i}>{p}</li>)}
                        </ul>
                      </div>
                    )}
                    {insight.insights.recommendations.length > 0 && (
                      <div className="mb-4">
                        <span className="text-xs font-semibold text-[#050038]/60 block mb-2">Recommendations:</span>
                        <ul className="text-sm text-[#050038]/70 space-y-1 list-disc pl-4">
                          {insight.insights.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-semibold",
                        insight.insights.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                          insight.insights.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                      )}>
                        {insight.insights.sentiment}
                      </span>
                      <span className="text-xs text-[#050038]/40">
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
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <Button
                  onClick={handleGenerateHeatmap}
                  disabled={heatmapLoading}
                  variant="secondary"
                  className="w-full justify-center"
                >
                  {heatmapLoading ? (
                    <><Loader2 size={14} className="mr-2 animate-spin" /> Generating...</>
                  ) : (
                    <><RefreshCw size={14} className="mr-2" /> Generate Heatmap from Sessions</>
                  )}
                </Button>

                {/* Predictive Heatmap Toggle */}
                {predictiveData.length > 0 && (
                  <div className="flex items-center justify-between bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-lg px-4 py-3">
                    <div>
                      <span className="text-sm font-semibold text-[#050038]">
                        Predictive Heatmap
                      </span>
                      <p className="text-xs text-[#050038]/50">
                        AI prediction · {predictiveData.length} zones
                      </p>
                    </div>
                    <button
                      onClick={() => setShowPredictive(prev => !prev)}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                        showPredictive ? "bg-gradient-to-r from-violet-500 to-fuchsia-500" : "bg-[#050038]/20"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                        showPredictive ? "translate-x-4" : "translate-x-0.5"
                      )} />
                    </button>
                  </div>
                )}

                {/* Generate Prediction Button */}
                <Button
                  onClick={handleGeneratePrediction}
                  disabled={predictiveLoading}
                  variant="secondary"
                  className="w-full justify-center border-violet-300 text-violet-700 hover:bg-violet-50"
                >
                  {predictiveLoading ? (
                    <><Loader2 size={14} className="mr-2 animate-spin" /> Analyzing visual hierarchy...</>
                  ) : (
                    <><Lightbulb size={14} className="mr-2" /> {predictiveData.length > 0 ? 'Regenerate Predictive Heatmap' : 'Generate Predictive Heatmap'}</>
                  )}
                </Button>

                <div>
                  <h3 className="text-base font-semibold text-[#050038] mb-3">Heatmap Legend</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#ef4444]" />
                      <span className="text-xs text-[#050038]/60">High activity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#ffd02f]" />
                      <span className="text-xs text-[#050038]/60">Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#4262ff]" />
                      <span className="text-xs text-[#050038]/60">Low</span>
                    </div>
                  </div>
                  <div className="h-4 w-full rounded-full bg-gradient-to-r from-[#4262ff] via-[#00ff88] via-[#ffd02f] to-[#ef4444] mb-2" />
                  <div className="flex justify-between text-[10px] text-[#050038]/40">
                    <span>Low</span>
                    <span>High</span>
                  </div>

                  {predictiveData.length > 0 && showPredictive && (
                    <div className="mt-4">
                      <h3 className="text-sm font-semibold text-[#050038] mb-2">
                        AI Prediction Layer
                      </h3>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-violet-500" />
                          <span className="text-xs text-[#050038]/60">Click zones</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-fuchsia-500" />
                          <span className="text-xs text-[#050038]/60">Attention</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-rose-500" />
                          <span className="text-xs text-[#050038]/60">Friction</span>
                        </div>
                      </div>
                      <div className="h-4 w-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 via-fuchsia-500 via-pink-500 to-rose-500" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-base font-semibold text-[#050038] mb-3">Click Distribution</h3>
                  {clickDistribution.length > 0 ? (
                    <div className="space-y-3">
                      {clickDistribution.map((item) => (
                        <div key={item.element} className="bg-[#fafafa] p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-[#050038]">{item.element}</span>
                            <span className="text-sm font-bold text-[#050038]">{item.clicks} clicks ({item.pct}%)</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#050038]/10">
                            <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, backgroundColor: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#fafafa] p-4 rounded-lg text-center">
                      <p className="text-sm text-[#050038]/60">No click data yet. Generate a heatmap to see distribution.</p>
                    </div>
                  )}
                </div>

                {heatmapData.length === 0 ? (
                  <div className="bg-[#fafafa] p-8 rounded-xl text-center">
                    <Layers size={32} className="mx-auto mb-4 text-[#ffd02f]" />
                    <h3 className="text-base font-semibold text-[#050038] mb-2">No heatmap generated yet</h3>
                    <p className="text-sm text-[#050038]/60">
                      Start a session or click 'Generate Heatmap' to analyze historical data.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#fafafa] p-4 rounded-lg">
                    <p className="text-xs text-[#050038]/60">
                      <Info size={12} className="inline mr-1" />
                      Showing {heatmapData.length} data points on the board canvas.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ FLOW TAB ═══ */}
            {activeTab === 'flow' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <h3 className="text-base font-semibold text-[#050038] mb-3">Task Flow Analysis</h3>
                  <p className="text-sm text-[#050038]/60 mb-4">User navigation paths through the prototype</p>
                </div>

                {flowLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-[#4262ff]" />
                    <span className="ml-2 text-sm text-[#050038]/60">Loading flow data...</span>
                  </div>
                ) : flowData.length > 0 ? (
                  <div className="space-y-3">
                    {flowData.map((flow, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 rounded-lg bg-white border border-[#050038]/10 p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-[#050038]">{flow.path.join(' → ')}</span>
                              <span className="text-sm font-bold text-[#4262ff]">{flow.percentage}%</span>
                            </div>
                            <div className="mt-2 h-2 rounded-full bg-[#050038]/10">
                              <div className="h-full rounded-full bg-[#4262ff] transition-all" style={{ width: `${flow.percentage}%` }} />
                            </div>
                            <span className="text-xs text-[#050038]/40 mt-1 block">{flow.count} sessions</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#fafafa] p-8 rounded-xl text-center">
                    <Layers size={32} className="mx-auto mb-4 text-[#4262ff]" />
                    <h3 className="text-base font-semibold text-[#050038] mb-2">No flow data yet</h3>
                    <p className="text-sm text-[#050038]/60">
                      Flow analysis will appear after participants complete test sessions.
                    </p>
                  </div>
                )}

                <div className="bg-[#fafafa] p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={14} className="text-[#4262ff]" />
                    <span className="text-sm font-semibold text-[#050038]">Key Insight</span>
                  </div>
                  <p className="text-sm text-[#050038]/70">
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

