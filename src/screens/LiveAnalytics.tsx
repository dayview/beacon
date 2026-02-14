import React, { useState, useEffect, useRef } from "react";
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
  Lock,
  RefreshCw,
  X
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { cn } from "../lib/utils";

interface LiveAnalyticsProps {
  onBack: () => void;
}

// Updated data to match the Blue -> Yellow -> Red intensity scale
const FIRST_CLICK_DATA = [
  { name: 'Sign Up', value: 78, color: '#ef4444' }, // Red (High)
  { name: 'Hero', value: 13, color: '#ffd02f' },    // Yellow (Medium)
  { name: 'Pricing', value: 6, color: '#4262ff' },   // Blue (Low)
  { name: 'Other', value: 3, color: '#fafafa' },
];

interface HeatmapZoneProps {
  intensity: 'low' | 'medium' | 'high';
  className?: string;
  insight: {
    title: string;
    cause: string;
    remedy: string;
  };
}

const HeatmapZone: React.FC<HeatmapZoneProps> = ({ intensity, className, insight }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const zoneRef = useRef<HTMLDivElement>(null);

  const colors = {
    low: { bg: 'bg-[#4262ff]', border: 'border-[#4262ff]', text: 'text-[#4262ff]', z: 'z-10' },
    medium: { bg: 'bg-[#ffd02f]', border: 'border-[#ffd02f]', text: 'text-[#ffd02f]', z: 'z-20' },
    high: { bg: 'bg-[#ef4444]', border: 'border-[#ef4444]', text: 'text-[#ef4444]', z: 'z-30' },
  };

  const style = colors[intensity];

  const handleMouseEnter = () => {
    setIsHovered(true);
    
    if (zoneRef.current) {
      const rect = zoneRef.current.getBoundingClientRect();
      const tooltipHeight = 180;
      const headerHeight = 64; // Approximate Miro header height
      
      // Check if there's enough space above (considering header)
      const spaceAbove = rect.top - headerHeight;
      setTooltipPosition(spaceAbove < tooltipHeight ? 'bottom' : 'top');
    }
  };

  return (
    <div 
      ref={zoneRef}
      className={cn("absolute group cursor-pointer", className, style.z)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Heatmap Blob with Outline */}
      <div className={cn(
        "w-full h-full rounded-full opacity-50 blur-xl transition-all duration-300",
        style.bg,
        isHovered ? "opacity-80 blur-md" : ""
      )} />
      
      {/* Explicit Outline (Ring) */}
      <div className={cn(
        "absolute inset-0 rounded-full border-2 border-dashed opacity-0 transition-opacity duration-300",
        style.border,
        isHovered ? "opacity-100" : "opacity-30"
      )} />

      {/* AI Insight Popover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: tooltipPosition === 'top' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: tooltipPosition === 'top' ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute left-1/2 w-64 -translate-x-1/2 pointer-events-none",
              tooltipPosition === 'top' ? "bottom-full mb-4" : "top-full mt-4"
            )}
            style={{ zIndex: 9999 }}
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
              
              {/* Arrow */}
              <div className={cn(
                "absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#050038] border-white/10",
                tooltipPosition === 'top' 
                  ? "top-full -mt-1 border-b border-r" 
                  : "bottom-full -mb-1 border-t border-l"
              )} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


export const LiveAnalytics: React.FC<LiveAnalyticsProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'heatmap' | 'flow' | 'ai'>('overview');
  const [highlightZone, setHighlightZone] = useState(false);
  const [stats, setStats] = useState({
    interactions: 847,
    activeUsers: 12,
    avgTime: "4m 32s",
    completion: "73%"
  });

  // Simulate live stats update
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        interactions: prev.interactions + Math.floor(Math.random() * 3),
        activeUsers: 12 + Math.floor(Math.random() * 3) - 1
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      {/* Top Toolbar */}
      <header className="flex h-14 items-center justify-between border-b border-[#050038]/10 bg-white px-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-[#050038]/60 hover:text-[#050038]">
             <span className="font-bold text-[#050038] text-xl">miro</span>
          </button>
          <div className="h-6 w-px bg-[#050038]/10"></div>
          <div className="flex items-center gap-2">
            <button className="rounded p-1.5 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]">
              <MousePointer2 size={20} />
            </button>
            <button className="rounded p-1.5 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]">
              <Hand size={20} />
            </button>
            <button className="rounded p-1.5 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]">
              <MessageSquare size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md border border-[#050038]/10 bg-white p-1">
            <button className="rounded p-1 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]">
              <Minus size={16} />
            </button>
            <span className="min-w-[48px] text-center text-sm font-medium text-[#050038]">100%</span>
            <button className="rounded p-1 text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div>
          <button className="flex items-center gap-2 rounded-md bg-[#ffd02f] px-4 py-2 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#ffd02f]/90">
            <Search size={16} className="rotate-90" />
            Beacon
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Board Canvas */}
        <div className="relative flex-1 bg-[#fafafa] overflow-auto">
           {/* Canvas Container - Centered */}
           <div className="absolute inset-0 flex items-center justify-center p-8 min-w-[1000px] min-h-[800px]">
             {/* The "Board" */}
             <div className="relative h-[800px] w-[1200px] bg-white shadow-lg rounded-sm overflow-hidden border border-[#050038]/10">
                
                {/* Board Content: Mobile App Prototype */}
                <div className="flex h-full w-full flex-col">
                    {/* Header */}
                    <div className="h-16 w-full bg-[#4262ff] flex items-center justify-between px-8">
                        <div className="h-8 w-8 bg-white/20 rounded-full"></div>
                        <div className="flex gap-4">
                             <div className="h-4 w-16 bg-white/20 rounded"></div>
                             <div className="h-4 w-16 bg-white/20 rounded"></div>
                        </div>
                    </div>
                    {/* Hero */}
                    <div className="flex-1 bg-white p-16 flex flex-col items-center justify-center border-b border-[#fafafa] relative">
                        <h1 className="text-4xl font-bold text-[#050038] mb-4">Transform Your Workflow</h1>
                        <p className="text-[#050038]/60 mb-8 max-w-md text-center">Collaborate, create, and innovate with our all-in-one platform.</p>
                        <div className="relative">
                            <button className="bg-[#ffd02f] text-[#050038] px-8 py-3 rounded-lg font-semibold text-lg shadow-sm">
                                Sign Up Now
                            </button>
                             
                             {/* ZONE 1: High Intensity (Red) - Sign Up Button */}
                             <HeatmapZone 
                                intensity="high" 
                                className="inset-0 -m-6 z-10"
                                insight={{
                                    title: "High Conversion Zone",
                                    cause: "Primary CTA placement aligns with F-pattern reading and uses high-contrast color.",
                                    remedy: "Performance is optimal. Consider A/B testing micro-copy to maximize further."
                                }}
                             />
                        </div>

                         {/* ZONE 2: Medium Intensity (Yellow) - Hero Text */}
                         <HeatmapZone 
                            intensity="medium" 
                            className="top-32 left-1/2 -translate-x-1/2 w-80 h-40 z-10"
                            insight={{
                                title: "Moderate Engagement",
                                cause: "Users are pausing to read the value proposition, but dwell time is lower than expected.",
                                remedy: "Simplify the headline to reduce cognitive load and speed up time-to-CTA."
                            }}
                         />
                    </div>
                    
                    {/* Features */}
                    <div className="h-64 bg-[#fafafa] flex gap-8 p-8 justify-center items-center">
                        <div className="h-40 w-64 bg-white rounded shadow-sm border border-[#050038]/10"></div>
                        <div className="h-40 w-64 bg-white rounded shadow-sm border border-[#050038]/10"></div>
                        <div className="h-40 w-64 bg-white rounded shadow-sm border border-[#050038]/10"></div>
                    </div>

                    {/* Pricing / Bottom */}
                    <div className={cn("flex-1 bg-white p-12 flex justify-center transition-all duration-500 relative", highlightZone ? "ring-4 ring-[#ffd02f] bg-[#fafafa]" : "")}>
                         <div className="w-full max-w-4xl flex gap-8">
                            <div className="flex-1 h-48 border border-[#050038]/10 rounded-lg p-6">
                                <div className="h-6 w-24 bg-[#fafafa] rounded mb-4"></div>
                                <div className="h-4 w-full bg-[#fafafa] rounded mb-2"></div>
                                <div className="h-4 w-2/3 bg-[#fafafa] rounded"></div>
                            </div>
                            <div className="flex-1 h-48 border border-[#050038]/10 rounded-lg p-6 relative">
                                 {/* Dead Zone Overlay */}
                                 {highlightZone && (
                                    <div className="absolute inset-0 bg-[#ffd02f]/10 flex items-center justify-center border-2 border-dashed border-[#ffd02f] rounded-lg z-20">
                                        <span className="bg-[#ffd02f] text-[#050038] px-2 py-1 rounded text-xs font-bold">0 Interactions</span>
                                    </div>
                                 )}
                                <div className="h-6 w-24 bg-[#fafafa] rounded mb-4"></div>
                                <div className="h-4 w-full bg-[#fafafa] rounded mb-2"></div>
                                <div className="h-4 w-2/3 bg-[#fafafa] rounded"></div>
                            </div>
                         </div>
                    </div>

                    {/* ZONE 3: Low Intensity (Blue) - Bottom Area */}
                    <HeatmapZone 
                        intensity="low" 
                        className="bottom-12 left-1/2 -translate-x-1/2 w-96 h-32 z-10"
                        insight={{
                            title: "Low Visibility Area",
                            cause: "Scroll depth drop-off is high (60%). Users aren't reaching this section.",
                            remedy: "Move critical pricing information higher or add visual cues (arrows) to encourage scrolling."
                        }}
                    />
                </div>

                {/* SVG Arrows Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#4262ff" fillOpacity="0.8" />
                        </marker>
                    </defs>
                    {/* Landing to Sign Up (Thick) */}
                    <path 
                        d="M 100 100 Q 300 200 600 350" 
                        fill="none" 
                        stroke="#4262ff" 
                        strokeWidth="8" 
                        strokeOpacity="0.2"
                        markerEnd="url(#arrowhead)"
                    />
                    {/* Landing to Pricing (Thin) */}
                    <path 
                        d="M 100 100 C 100 400 300 600 500 700" 
                        fill="none" 
                        stroke="#4262ff" 
                        strokeWidth="2" 
                        strokeOpacity="0.2"
                        markerEnd="url(#arrowhead)"
                    />
                </svg>
             </div>
           </div>
        </div>

        {/* Right Sidebar: Analytics Panel */}
        <div className="w-[480px] flex-shrink-0 border-l border-[#050038]/10 bg-white shadow-[-4px_0_16px_rgba(5,0,56,0.05)] flex flex-col">
          {/* Panel Header */}
          <div className="p-6 border-b border-[#050038]/10">
            <h2 className="text-lg font-semibold text-[#050038]">Mobile v2 Usability Test</h2>
            <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Badge variant="live">Live</Badge>
                    <span className="text-sm text-[#050038]/60">{stats.activeUsers} participants</span>
                </div>
                <div className="flex items-center gap-4 text-[#050038]/60">
                    <button className="hover:text-[#050038]"><Settings size={20} /></button>
                    <button className="hover:text-[#050038]"><Pause size={20} /></button>
                    <button className="hover:text-[#050038] text-[#050038]"><Square size={20} fill="currentColor" /></button>
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
                                activeTab === id
                                    ? "border-[#4262ff] text-[#4262ff]"
                                    : "border-transparent text-[#050038]/60 hover:text-[#050038]"
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
            
            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <span className="text-3xl font-bold text-[#050038]">{stats.interactions}</span>
                                <MousePointer2 size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Total Interactions</span>
                        </div>
                        <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <span className="text-3xl font-bold text-[#050038]">{stats.activeUsers}</span>
                                <Users size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Active Users</span>
                        </div>
                        <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <span className="text-3xl font-bold text-[#050038]">{stats.avgTime}</span>
                                <Clock size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Avg. Time</span>
                        </div>
                        <div className="bg-[#fafafa] p-4 rounded-lg">
                            <div className="flex justify-between items-start">
                                <span className="text-3xl font-bold text-[#050038]">{stats.completion}</span>
                                <CheckCircle size={16} className="text-[#4262ff]" />
                            </div>
                            <span className="text-xs text-[#050038]/60 mt-1 block">Completion Rate</span>
                        </div>
                    </div>

                    {/* First-Click Analysis */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-base font-semibold text-[#050038]">First-Click Analysis</h3>
                            <Info size={14} className="text-[#050038]/60" />
                        </div>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={FIRST_CLICK_DATA} margin={{ left: 0, right: 30 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12, fill: '#050038' }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        cursor={{fill: 'transparent'}}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(5,0,56,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                                        {FIRST_CLICK_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Dead Zones */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-base font-semibold text-[#050038]">Dead Zones Detected</h3>
                            <AlertTriangle size={16} className="text-[#ffd02f]" />
                        </div>
                        <div className="bg-[#ffd02f]/10 border border-[#ffd02f] p-4 rounded-lg">
                            <p className="font-medium text-[#050038]">Section C (bottom-right): 0 interactions</p>
                            <p className="text-xs text-[#050038]/80 mt-1">Confidence: 95%</p>
                            <button 
                                onClick={() => setHighlightZone(!highlightZone)}
                                className="mt-3 text-sm font-semibold text-[#050038] underline decoration-[#ffd02f] hover:text-[#050038]/80"
                            >
                                {highlightZone ? "Hide on board" : "Highlight on board"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'ai' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Context Input */}
                    <div>
                        <label className="block text-sm font-semibold text-[#050038] mb-3">What would you like to improve?</label>
                        <div className="flex items-center justify-between bg-white rounded-full border border-[#050038]/10 p-1 pr-4">
                            <span className="bg-[#4262ff]/10 text-[#4262ff] px-4 py-2 rounded-full text-sm font-medium">Increase CTA clicks</span>
                            <button className="text-sm font-medium text-[#4262ff] hover:text-[#4262ff]/80">Change</button>
                        </div>
                    </div>

                    {/* Insight Card 1 */}
                    <div className="bg-white border border-[#050038]/10 p-6 rounded-xl shadow-sm">
                        <Lightbulb className="text-[#ffd02f] mb-4" size={24} />
                        <h3 className="text-lg font-semibold text-[#050038] mb-2">CTA Placement Optimization</h3>
                        <p className="text-sm text-[#050038]/70 leading-relaxed mb-4">
                            Navigation patterns suggest users expect the CTA in the top-right corner. Users who found it there completed tasks 40% faster.
                        </p>
                        <div className="h-px bg-[#050038]/10 w-full mb-4"></div>
                        <div className="mb-4">
                            <span className="text-xs font-semibold text-[#050038]/60 block mb-2">Supporting data:</span>
                            <ul className="text-sm text-[#050038]/70 space-y-1 list-disc pl-4">
                                <li>78% first-clicked top area (±6%)</li>
                                <li>Current CTA: bottom-left (23% miss rate)</li>
                            </ul>
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                             <Button variant="secondary" size="sm">Show on board</Button>
                             <button className="text-sm font-medium text-[#4262ff] flex items-center gap-1">
                                Expand calculation <ChevronDown size={14} />
                             </button>
                        </div>
                    </div>

                    {/* Insight Card 2 */}
                    <div className="bg-white border border-[#050038]/10 p-6 rounded-xl shadow-sm">
                        <Lightbulb className="text-[#ffd02f] mb-4" size={24} />
                        <h3 className="text-lg font-semibold text-[#050038] mb-2">Dead Zone Recovery</h3>
                        <p className="text-sm text-[#050038]/70 leading-relaxed mb-4">
                            Section C received 0 interactions (95% confidence). Consider adding visual hierarchy or moving content to high-attention zones.
                        </p>
                         <div className="flex items-center gap-3 mt-4">
                             <Button variant="secondary" size="sm" onClick={() => setHighlightZone(!highlightZone)}>
                                {highlightZone ? "Hide" : "Show on board"}
                             </Button>
                        </div>
                    </div>

                    {/* Transparency Controls */}
                    <div className="bg-[#fafafa] p-6 rounded-xl border border-[#050038]/10">
                        <div className="flex items-center gap-2 mb-4">
                            <h3 className="text-base font-semibold text-[#050038]">Statistical Transparency</h3>
                            <Lock size={14} className="text-[#050038]/60" />
                        </div>
                        <div className="relative mb-4">
                            <select className="w-full appearance-none bg-white border border-[#050038]/10 text-[#050038] text-sm rounded-md px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#4262ff]">
                                <option>Statistical method: Auto-calculated</option>
                                <option>Bayesian Inference</option>
                                <option>Frequentist (t-test)</option>
                            </select>
                            <ChevronDown className="absolute right-3 top-2.5 text-[#050038]/60 pointer-events-none" size={16} />
                        </div>
                        <button className="text-sm text-[#050038]/60 hover:text-[#050038] flex items-center gap-1 mb-4">
                             <span className="text-lg">📊</span> View all calculations
                        </button>
                        <Button variant="secondary" className="w-full justify-center">
                            <RefreshCw size={14} className="mr-2" />
                            Recalculate with new data
                        </Button>
                    </div>
                 </div>
            )}
            
            {/* Placeholder for other tabs */}
            {(activeTab === 'heatmap' || activeTab === 'flow') && (
                 <div className="flex h-64 items-center justify-center text-[#050038]/60">
                    <p>Visualization active on board</p>
                 </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple icon wrapper since I missed importing CheckCircle and Clock/Users were confusing in scope
const CheckCircle = ({size, className}: {size: number, className?: string}) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const Clock = ({size, className}: {size: number, className?: string}) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
);

const Users = ({size, className}: {size: number, className?: string}) => (
     <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
)
