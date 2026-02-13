import React, { useState } from "react";
import { ChevronDown, Check, ArrowLeft, Lightbulb, FileDown } from "lucide-react";
import { Button } from "../components/ui/Button";

interface ComparisonProps {
  onBack: () => void;
}

export const Comparison: React.FC<ComparisonProps> = ({ onBack }) => {
  return (
    <div className="min-h-screen bg-[#fafafa] p-8 font-sans">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div>
           <nav className="flex items-center text-sm text-[#050038]/60 mb-4">
            <span className="cursor-pointer hover:text-[#050038]">Analytics</span>
            <span className="mx-2">/</span>
            <span className="cursor-pointer hover:text-[#050038]">Archived</span>
            <span className="mx-2">/</span>
            <span className="font-semibold text-[#050038]">Compare</span>
           </nav>
           <h1 className="text-[32px] font-bold text-[#050038]">Test Comparison</h1>
        </div>

        {/* Test Selectors */}
        <div className="mt-8 flex items-center gap-6">
            <div className="relative w-[300px]">
                <select className="w-full appearance-none rounded-lg border border-[#050038]/10 bg-white px-4 py-3 pr-10 text-base font-medium text-[#050038] shadow-sm focus:border-[#4262ff] focus:outline-none focus:ring-1 focus:ring-[#4262ff]">
                    <option>Test A: Mobile v1</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#050038]/60 pointer-events-none" size={20} />
            </div>
            
            <span className="text-2xl font-medium text-[#050038]/60">vs</span>

            <div className="relative w-[300px]">
                <select className="w-full appearance-none rounded-lg border border-[#050038]/10 bg-white px-4 py-3 pr-10 text-base font-medium text-[#050038] shadow-sm focus:border-[#4262ff] focus:outline-none focus:ring-1 focus:ring-[#4262ff]">
                    <option>Test B: Mobile v2</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#050038]/60 pointer-events-none" size={20} />
            </div>
        </div>

        {/* Comparison Grid */}
        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-[0px_2px_8px_rgba(5,0,56,0.08)]">
            <div className="grid grid-cols-[200px_1fr_1fr] divide-x divide-[#fafafa]">
                {/* Headers (Implicit in structure but visual layout handled per row) */}
                
                {/* Row 1: Heatmap Preview */}
                <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">Heatmap</div>
                <div className="p-6 border-b border-[#fafafa]">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#fafafa] border border-[#050038]/10">
                        {/* Mock Heatmap A */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3/4 h-3/4 bg-white shadow-sm flex flex-col p-2 gap-2 opacity-50">
                                <div className="h-4 bg-[#fafafa] w-full rounded"></div>
                                <div className="h-20 bg-[#fafafa] w-full rounded"></div>
                                <div className="flex-1 bg-[#fafafa] w-full rounded relative">
                                    <div className="absolute bottom-2 left-2 w-8 h-8 bg-[#4262ff] rounded-full blur-xl opacity-60"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-b border-[#fafafa]">
                     <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#fafafa] border border-[#050038]/10">
                        {/* Mock Heatmap B */}
                        <div className="absolute inset-0 flex items-center justify-center">
                             <div className="w-3/4 h-3/4 bg-white shadow-sm flex flex-col p-2 gap-2 opacity-50">
                                <div className="h-4 bg-[#fafafa] w-full rounded"></div>
                                <div className="h-20 bg-[#fafafa] w-full rounded relative">
                                    {/* Heatmap moved to Hero in V2 */}
                                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-8 bg-[#ffd02f] rounded-full blur-xl opacity-70"></div>
                                </div>
                                <div className="flex-1 bg-[#fafafa] w-full rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: First-Click */}
                <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">First-Click CTA</div>
                <div className="p-6 border-b border-[#fafafa]">
                    <div className="flex flex-col gap-2">
                        <span className="text-2xl font-bold text-[#050038]/60">45% <span className="text-base font-normal text-[#050038]/40">(±7%)</span></span>
                        <div className="h-2 w-full max-w-[200px] rounded-full bg-[#fafafa]">
                            <div className="h-full w-[45%] rounded-full bg-[#050038]/40"></div>
                        </div>
                    </div>
                </div>
                <div className="p-6 border-b border-[#fafafa]">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                             <span className="text-2xl font-bold text-[#4262ff]">78% <span className="text-base font-normal text-[#4262ff]/60">(±6%)</span></span>
                             <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4262ff]/10">
                                <Check size={12} className="text-[#4262ff]" />
                             </div>
                        </div>
                        <div className="h-2 w-full max-w-[200px] rounded-full bg-[#fafafa]">
                            <div className="h-full w-[78%] rounded-full bg-[#4262ff]"></div>
                        </div>
                    </div>
                </div>

                {/* Row 3: Dead Zones */}
                <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">Dead Zones</div>
                <div className="p-6 border-b border-[#fafafa]">
                    <span className="text-2xl font-bold text-[#050038]/60">3 zones</span>
                </div>
                <div className="p-6 border-b border-[#fafafa]">
                    <div className="flex items-center gap-2">
                         <span className="text-2xl font-bold text-[#4262ff]">1 zone</span>
                         <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4262ff]/10">
                            <Check size={12} className="text-[#4262ff]" />
                         </div>
                    </div>
                </div>

                 {/* Row 4: Completion */}
                <div className="p-6 flex items-center font-semibold text-[#050038]">Completion Rate</div>
                <div className="p-6">
                    <span className="text-2xl font-bold text-[#050038]/60">60%</span>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-2">
                         <span className="text-2xl font-bold text-[#4262ff]">73%</span>
                         <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4262ff]/10">
                            <Check size={12} className="text-[#4262ff]" />
                         </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Statistical Summary Card */}
        <div className="mt-6 rounded-xl border border-[#4262ff]/20 bg-[#4262ff]/5 p-6">
            <p className="text-base text-[#4262ff]">
                Test B shows 33% improvement in first-click accuracy (statistically significant, p&lt;0.05)
            </p>
        </div>

        {/* AI Summary Card */}
        <div className="mt-4 flex gap-4 rounded-xl border border-[#ffd02f] bg-[#ffd02f]/10 p-6">
            <Lightbulb className="flex-shrink-0 text-[#050038]" />
            <p className="text-base text-[#050038]">
                Version 2's CTA placement led to 22% faster task completion. Recommend shipping this version.
            </p>
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex items-center gap-4">
            <Button variant="primary">
                <FileDown size={18} className="mr-2" />
                Export Comparison PDF
            </Button>
            <Button variant="secondary" onClick={onBack}>
                <ArrowLeft size={18} className="mr-2" />
                Back to Results
            </Button>
        </div>
      </div>
    </div>
  );
};
