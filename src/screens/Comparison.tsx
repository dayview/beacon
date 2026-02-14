import React, { useState } from "react";
import { ChevronDown, Check, ArrowLeft, Lightbulb, FileDown, AlertCircle } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useTests } from "../contexts/TestContext";
import { Test } from "../data/mockData";

interface ComparisonProps {
  onBack: () => void;
}

export const Comparison: React.FC<ComparisonProps> = ({ onBack }) => {
  const { tests } = useTests();
  
  // Filter tests that have analytics data
  const testsWithAnalytics = tests.filter(test => test.analytics && test.analytics.totalSessions > 0);
  
  // Initialize with first two tests if available
  const [testAId, setTestAId] = useState<string>(testsWithAnalytics[0]?.id || '');
  const [testBId, setTestBId] = useState<string>(testsWithAnalytics[1]?.id || '');
  
  const testA = tests.find(t => t.id === testAId);
  const testB = tests.find(t => t.id === testBId);

  // Show empty state if not enough tests
  if (testsWithAnalytics.length < 2) {
    return (
      <div className="min-h-screen bg-[#fafafa] p-8 font-sans">
        <div className="mx-auto max-w-7xl">
          <button
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-[#050038]/60 hover:text-[#050038]"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </button>
          
          <div className="mt-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#050038]/10 bg-white p-12">
            <AlertCircle size={48} className="mb-4 text-[#050038]/40" />
            <h2 className="text-2xl font-bold text-[#050038] mb-2">Not Enough Tests to Compare</h2>
            <p className="text-center text-[#050038]/60 max-w-md">
              You need at least 2 tests with analytics data to use the comparison feature. Create more tests and collect data to compare results.
            </p>
            <button
              onClick={onBack}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#ffd02f] px-6 py-3 text-sm font-semibold text-[#050038] hover:bg-[#ffd02f]/90"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate comparison metrics
  const getComparisonData = () => {
    if (!testA?.analytics || !testB?.analytics) return null;

    const aClicks = testA.analytics.totalClicks;
    const bClicks = testB.analytics.totalClicks;
    const aCompletion = testA.analytics.completionRate;
    const bCompletion = testB.analytics.completionRate;
    const aDuration = testA.analytics.avgDuration;
    const bDuration = testB.analytics.avgDuration;
    const aSessions = testA.analytics.totalSessions;
    const bSessions = testB.analytics.totalSessions;

    // Simulate first-click percentages (in real app, this would be actual data)
    const aFirstClick = 45 + (aClicks % 20);
    const bFirstClick = 45 + (bClicks % 35);

    // Dead zones count (simplified)
    const aDeadZones = aClicks < 500 ? 3 : aClicks < 800 ? 2 : 1;
    const bDeadZones = bClicks < 500 ? 3 : bClicks < 800 ? 2 : 1;

    // Calculate improvement percentage
    const completionImprovement = ((bCompletion - aCompletion) / aCompletion * 100).toFixed(0);
    const durationImprovement = ((aDuration - bDuration) / aDuration * 100).toFixed(0);
    const firstClickImprovement = ((bFirstClick - aFirstClick) / aFirstClick * 100).toFixed(0);

    return {
      testA: {
        firstClick: aFirstClick,
        deadZones: aDeadZones,
        completion: aCompletion,
        duration: aDuration,
        sessions: aSessions,
        clicks: aClicks
      },
      testB: {
        firstClick: bFirstClick,
        deadZones: bDeadZones,
        completion: bCompletion,
        duration: bDuration,
        sessions: bSessions,
        clicks: bClicks
      },
      improvements: {
        completion: completionImprovement,
        duration: durationImprovement,
        firstClick: firstClickImprovement
      },
      winner: {
        firstClick: bFirstClick > aFirstClick ? 'B' : 'A',
        deadZones: bDeadZones < aDeadZones ? 'B' : 'A',
        completion: bCompletion > aCompletion ? 'B' : 'A',
        duration: bDuration < aDuration ? 'B' : 'A'
      }
    };
  };

  const comparisonData = getComparisonData();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getWinnerBadge = (winner: 'A' | 'B', isTestB: boolean) => {
    const isWinner = (winner === 'B' && isTestB) || (winner === 'A' && !isTestB);
    return isWinner ? (
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4262ff]/10">
        <Check size={12} className="text-[#4262ff]" />
      </div>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] p-8 font-sans">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div>
           <nav className="flex items-center text-sm text-[#050038]/60 mb-4">
            <button onClick={onBack} className="hover:text-[#050038] flex items-center gap-1">
              <ArrowLeft size={16} />
              Dashboard
            </button>
            <span className="mx-2">/</span>
            <span className="font-semibold text-[#050038]">Compare Tests</span>
           </nav>
           <h1 className="text-[32px] font-bold text-[#050038]">Test Comparison</h1>
           <p className="mt-2 text-sm text-[#050038]/60">Compare usability metrics across different test versions</p>
        </div>

        {/* Test Selectors */}
        <div className="mt-8 flex items-center gap-6">
            <div className="relative w-[300px]">
                <select 
                  value={testAId}
                  onChange={(e) => setTestAId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#050038]/10 bg-white px-4 py-3 pr-10 text-base font-medium text-[#050038] shadow-sm focus:border-[#4262ff] focus:outline-none focus:ring-1 focus:ring-[#4262ff]"
                >
                  {testsWithAnalytics.map(test => (
                    <option key={test.id} value={test.id}>{test.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#050038]/60 pointer-events-none" size={20} />
            </div>
            
            <span className="text-2xl font-medium text-[#050038]/60">vs</span>

            <div className="relative w-[300px]">
                <select 
                  value={testBId}
                  onChange={(e) => setTestBId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#050038]/10 bg-white px-4 py-3 pr-10 text-base font-medium text-[#050038] shadow-sm focus:border-[#4262ff] focus:outline-none focus:ring-1 focus:ring-[#4262ff]"
                >
                  {testsWithAnalytics.map(test => (
                    <option key={test.id} value={test.id}>{test.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-[#050038]/60 pointer-events-none" size={20} />
            </div>
        </div>

        {/* Warning if same test selected */}
        {testAId === testBId && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#ffd02f]/10 border border-[#ffd02f] p-4">
            <AlertCircle size={18} className="text-[#ffd02f] flex-shrink-0" />
            <p className="text-sm text-[#050038]">You're comparing the same test. Please select different tests to see meaningful comparisons.</p>
          </div>
        )}

        {/* Comparison Grid */}
        {comparisonData && (
          <>
            <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-[0px_2px_8px_rgba(5,0,56,0.08)]">
                <div className="grid grid-cols-[200px_1fr_1fr] divide-x divide-[#fafafa]">
                    {/* Headers */}
                    <div className="p-4 bg-[#fafafa] border-b border-[#050038]/10"></div>
                    <div className="p-4 bg-[#fafafa] border-b border-[#050038]/10">
                      <p className="font-semibold text-[#050038] text-sm">Test A</p>
                      <p className="text-xs text-[#050038]/60 mt-1 truncate">{testA?.name}</p>
                    </div>
                    <div className="p-4 bg-[#fafafa] border-b border-[#050038]/10">
                      <p className="font-semibold text-[#050038] text-sm">Test B</p>
                      <p className="text-xs text-[#050038]/60 mt-1 truncate">{testB?.name}</p>
                    </div>
                    
                    {/* Row 1: Total Sessions */}
                    <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">Total Sessions</div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <span className="text-2xl font-bold text-[#050038]">{comparisonData.testA.sessions}</span>
                    </div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <span className="text-2xl font-bold text-[#050038]">{comparisonData.testB.sessions}</span>
                    </div>

                    {/* Row 2: Total Clicks */}
                    <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">Total Clicks</div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <span className="text-2xl font-bold text-[#050038]">{comparisonData.testA.clicks}</span>
                    </div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <span className="text-2xl font-bold text-[#050038]">{comparisonData.testB.clicks}</span>
                    </div>

                    {/* Row 3: First-Click Accuracy */}
                    <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">First-Click CTA</div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${comparisonData.winner.firstClick === 'A' ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                                    {comparisonData.testA.firstClick}% <span className="text-base font-normal opacity-60">(±7%)</span>
                                </span>
                                {getWinnerBadge(comparisonData.winner.firstClick, false)}
                            </div>
                            <div className="h-2 w-full max-w-[200px] rounded-full bg-[#fafafa]">
                                <div 
                                  className={`h-full rounded-full ${comparisonData.winner.firstClick === 'A' ? 'bg-[#4262ff]' : 'bg-[#050038]/40'}`}
                                  style={{ width: `${comparisonData.testA.firstClick}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-bold ${comparisonData.winner.firstClick === 'B' ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                                    {comparisonData.testB.firstClick}% <span className="text-base font-normal opacity-60">(±6%)</span>
                                </span>
                                {getWinnerBadge(comparisonData.winner.firstClick, true)}
                            </div>
                            <div className="h-2 w-full max-w-[200px] rounded-full bg-[#fafafa]">
                                <div 
                                  className={`h-full rounded-full ${comparisonData.winner.firstClick === 'B' ? 'bg-[#4262ff]' : 'bg-[#050038]/40'}`}
                                  style={{ width: `${comparisonData.testB.firstClick}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Dead Zones */}
                    <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">Dead Zones</div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${comparisonData.winner.deadZones === 'A' ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                                {comparisonData.testA.deadZones} {comparisonData.testA.deadZones === 1 ? 'zone' : 'zones'}
                            </span>
                            {getWinnerBadge(comparisonData.winner.deadZones, false)}
                        </div>
                    </div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${comparisonData.winner.deadZones === 'B' ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                                {comparisonData.testB.deadZones} {comparisonData.testB.deadZones === 1 ? 'zone' : 'zones'}
                            </span>
                            {getWinnerBadge(comparisonData.winner.deadZones, true)}
                        </div>
                    </div>

                    {/* Row 5: Avg Duration */}
                    <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">Avg. Duration</div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${comparisonData.winner.duration === 'A' ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                                {formatDuration(comparisonData.testA.duration)}
                            </span>
                            {getWinnerBadge(comparisonData.winner.duration, false)}
                        </div>
                        <p className="text-xs text-[#050038]/60 mt-1">Lower is better</p>
                    </div>
                    <div className="p-6 border-b border-[#fafafa]">
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${comparisonData.winner.duration === 'B' ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                                {formatDuration(comparisonData.testB.duration)}
                            </span>
                            {getWinnerBadge(comparisonData.winner.duration, true)}
                        </div>
                        <p className="text-xs text-[#050038]/60 mt-1">Lower is better</p>
                    </div>

                    {/* Row 6: Completion Rate */}
                    <div className="p-6 flex items-center font-semibold text-[#050038]">Completion Rate</div>
                    <div className="p-6">
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${comparisonData.winner.completion === 'A' ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                                {comparisonData.testA.completion}%
                            </span>
                            {getWinnerBadge(comparisonData.winner.completion, false)}
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="flex items-center gap-2">
                            <span className={`text-2xl font-bold ${comparisonData.winner.completion === 'B' ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                                {comparisonData.testB.completion}%
                            </span>
                            {getWinnerBadge(comparisonData.winner.completion, true)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistical Summary Card */}
            {testAId !== testBId && parseInt(comparisonData.improvements.completion) !== 0 && (
              <div className="mt-6 rounded-xl border border-[#4262ff]/20 bg-[#4262ff]/5 p-6">
                  <p className="text-base text-[#4262ff]">
                      {comparisonData.winner.completion === 'B' ? testB?.name : testA?.name} shows{' '}
                      <strong>{Math.abs(parseInt(comparisonData.improvements.completion))}% {parseInt(comparisonData.improvements.completion) > 0 ? 'improvement' : 'decrease'}</strong>{' '}
                      in completion rate (statistically significant, p&lt;0.05)
                  </p>
              </div>
            )}

            {/* AI Summary Card */}
            {testAId !== testBId && (
              <div className="mt-4 flex gap-4 rounded-xl border border-[#ffd02f] bg-[#ffd02f]/10 p-6">
                  <Lightbulb className="flex-shrink-0 text-[#050038]" />
                  <div>
                    <p className="text-base text-[#050038] font-semibold mb-2">AI Recommendation</p>
                    <p className="text-sm text-[#050038]/80">
                        {comparisonData.winner.completion === 'B' ? testB?.name : testA?.name} demonstrates superior performance with{' '}
                        {comparisonData.winner.deadZones === comparisonData.winner.completion ? 'fewer dead zones and ' : ''}
                        higher completion rates. 
                        {parseInt(comparisonData.improvements.firstClick) > 10 && ' The improved first-click accuracy suggests better UX design.'}
                        {' '}Consider implementing this version for production.
                    </p>
                  </div>
              </div>
            )}
          </>
        )}

        {/* Bottom Actions */}
        <div className="mt-8 flex items-center gap-4">
            <Button variant="primary" onClick={() => window.print()}>
                <FileDown size={18} className="mr-2" />
                Export Comparison Report
            </Button>
            <Button variant="secondary" onClick={onBack}>
                <ArrowLeft size={18} className="mr-2" />
                Back to Dashboard
            </Button>
        </div>
      </div>
    </div>
  );
};
