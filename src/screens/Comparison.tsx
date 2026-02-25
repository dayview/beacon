import React, { useState, useEffect, useCallback } from "react";
import { ChevronDown, Check, ArrowLeft, Lightbulb, FileDown, AlertCircle, Loader2, TrendingUp, Info } from "lucide-react";
import { Button } from "../components/ui/Button";
import { useTests, Test } from "../contexts/TestContext";
import { api, ApiComparisonMetrics } from "../lib/api";

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

  const [metricsA, setMetricsA] = useState<ApiComparisonMetrics | null>(null);
  const [metricsB, setMetricsB] = useState<ApiComparisonMetrics | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (
    testId: string,
    setter: (m: ApiComparisonMetrics | null) => void,
    setLoading: (v: boolean) => void
  ) => {
    if (!testId) return;
    setLoading(true);
    setMetricsError(null);
    try {
      const data = await api.fetchComparisonMetrics(testId);
      setter(data.metrics);
    } catch (err: any) {
      setMetricsError(err?.message || 'Failed to load metrics.');
      setter(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (testAId) fetchMetrics(testAId, setMetricsA, setLoadingA);
    else setMetricsA(null);
  }, [testAId, fetchMetrics]);

  useEffect(() => {
    if (testBId) fetchMetrics(testBId, setMetricsB, setLoadingB);
    else setMetricsB(null);
  }, [testBId, fetchMetrics]);

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

  const isDataReady = metricsA !== null && metricsB !== null
    && !loadingA && !loadingB && testAId !== testBId;

  const winner = isDataReady ? {
    firstClick: (metricsB!.firstClickAccuracy ?? 0) >=
      (metricsA!.firstClickAccuracy ?? 0) ? 'B' as const
      : 'A' as const,
    deadZones: metricsB!.deadZonesCount <= metricsA!.deadZonesCount
      ? 'B' as const : 'A' as const,
    completion: metricsB!.completionRate >= metricsA!.completionRate
      ? 'B' as const : 'A' as const,
    duration: metricsB!.avgDuration <= metricsA!.avgDuration
      ? 'B' as const : 'A' as const,
  } : null;

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

        {/* Loading state */}
        {(loadingA || loadingB) && (
          <div className="mt-8 flex items-center justify-center py-16 rounded-xl bg-white shadow-[0px_2px_8px_rgba(5,0,56,0.08)]">
            <Loader2 size={24} className="animate-spin text-[#4262ff]" />
            <span className="ml-3 text-sm text-[#050038]/60">
              Loading comparison data...
            </span>
          </div>
        )}

        {/* Error state */}
        {metricsError && !loadingA && !loadingB && (
          <div className="mt-8 rounded-xl bg-red-50 border border-red-200 p-6 text-center">
            <p className="text-sm text-red-600">{metricsError}</p>
          </div>
        )}

        {/* Main comparison grid — only shown when both metrics loaded */}
        {isDataReady && (
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
                <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">
                  Total Sessions
                </div>
                <div className="p-6 border-b border-[#fafafa]">
                  <span className="text-2xl font-bold text-[#050038]">
                    {metricsA!.totalSessions}
                  </span>
                </div>
                <div className="p-6 border-b border-[#fafafa]">
                  <span className="text-2xl font-bold text-[#050038]">
                    {metricsB!.totalSessions}
                  </span>
                </div>

                {/* Row 2: Total Clicks */}
                <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">
                  Total Clicks
                </div>
                <div className="p-6 border-b border-[#fafafa]">
                  <span className="text-2xl font-bold text-[#050038]">
                    {metricsA!.totalClicks}
                  </span>
                </div>
                <div className="p-6 border-b border-[#fafafa]">
                  <span className="text-2xl font-bold text-[#050038]">
                    {metricsB!.totalClicks}
                  </span>
                </div>

                {/* Row 3: First-Click Accuracy */}
                <div className="p-6 flex items-center gap-2 font-semibold text-[#050038] border-b border-[#fafafa]">
                  First-Click CTA
                  {(metricsA!.firstClickIsEstimated || metricsB!.firstClickIsEstimated) && (
                    <span title="No task target elements defined — showing affordance accuracy instead" className="cursor-help">
                      <Info size={13} className="text-[#050038]/40" />
                    </span>
                  )}
                </div>
                {[metricsA!, metricsB!].map((m, i) => (
                  <div key={i} className="p-6 border-b border-[#fafafa]">
                    {m.firstClickAccuracy === null ? (
                      <span className="text-sm text-[#050038]/40">
                        No click data
                      </span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-2xl font-bold ${winner!.firstClick === (i === 0 ? 'A' : 'B') ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                            {m.firstClickAccuracy}%
                            {m.firstClickIsEstimated && (
                              <span className="ml-1 text-xs font-normal text-[#050038]/40">
                                est.
                              </span>
                            )}
                          </span>
                          {getWinnerBadge(winner!.firstClick, i === 1)}
                        </div>
                        <div className="h-2 w-full max-w-[200px] rounded-full bg-[#fafafa]">
                          <div
                            className={`h-full rounded-full ${winner!.firstClick === (i === 0 ? 'A' : 'B') ? 'bg-[#4262ff]' : 'bg-[#050038]/40'}`}
                            style={{ width: `${m.firstClickAccuracy}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Row 4: Dead Zones */}
                <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">
                  Confusion Zones
                </div>
                {[metricsA!, metricsB!].map((m, i) => (
                  <div key={i} className="p-6 border-b border-[#fafafa]">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${winner!.deadZones === (i === 0 ? 'A' : 'B') ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                        {m.deadZonesCount} {m.deadZonesCount === 1 ? 'zone' : 'zones'}
                      </span>
                      {getWinnerBadge(winner!.deadZones, i === 1)}
                    </div>
                    {m.deadZoneElements && m.deadZoneElements.length > 0 && (
                      <p className="mt-1 text-xs text-[#050038]/40 truncate max-w-[180px]">
                        {m.deadZoneElements.join(', ')}
                      </p>
                    )}
                  </div>
                ))}

                {/* Row 5: Avg Duration */}
                <div className="p-6 flex items-center font-semibold text-[#050038] border-b border-[#fafafa]">
                  Avg. Duration
                </div>
                {[metricsA!, metricsB!].map((m, i) => (
                  <div key={i} className="p-6 border-b border-[#fafafa]">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${winner!.duration === (i === 0 ? 'A' : 'B') ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                        {formatDuration(m.avgDuration)}
                      </span>
                      {getWinnerBadge(winner!.duration, i === 1)}
                    </div>
                    <p className="text-xs text-[#050038]/60 mt-1">
                      Lower is better
                    </p>
                  </div>
                ))}

                {/* Row 6: Completion Rate */}
                <div className="p-6 flex items-center font-semibold text-[#050038]">
                  Completion Rate
                </div>
                {[metricsA!, metricsB!].map((m, i) => (
                  <div key={i} className="p-6">
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${winner!.completion === (i === 0 ? 'A' : 'B') ? 'text-[#4262ff]' : 'text-[#050038]/60'}`}>
                        {m.completionRate}%
                      </span>
                      {getWinnerBadge(winner!.completion, i === 1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Statistical Summary Card */}
            {isDataReady && (() => {
              const pA = metricsA!.completionRate / 100;
              const pB = metricsB!.completionRate / 100;
              const nA = metricsA!.totalSessions;
              const nB = metricsB!.totalSessions;
              const pPool = (pA * nA + pB * nB) / (nA + nB);
              const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
              const zScore = se > 0 ? Math.abs((pA - pB) / se) : 0;
              const isSignificant = zScore > 1.96;
              const diff = Math.abs(metricsB!.completionRate - metricsA!.completionRate);
              if (diff === 0) return null;
              const betterName = winner?.completion === 'B' ? testB?.name : testA?.name;
              return (
                <div className="mt-6 rounded-xl border border-[#4262ff]/20 bg-[#4262ff]/5 p-6">
                  <div className="flex items-start gap-3">
                    <TrendingUp size={18} className="mt-0.5 flex-shrink-0 text-[#4262ff]" />
                    <p className="text-base text-[#4262ff]">
                      <strong>{betterName}</strong> shows a{' '}
                      <strong>{diff}% difference</strong> in completion rate
                      {isSignificant
                        ? ' (statistically significant at 95% confidence)'
                        : ' (not yet statistically significant — collect more sessions)'}
                      .
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Data-Driven Recommendation Card */}
            {isDataReady && (() => {
              const wins: Record<'A' | 'B', number> = { A: 0, B: 0 };
              if (winner!.completion === 'B') wins.B++; else wins.A++;
              if (winner!.duration === 'B') wins.B++; else wins.A++;
              if (winner!.firstClick === 'B') wins.B++; else wins.A++;
              if (winner!.deadZones === 'B') wins.B++; else wins.A++;
              const overallWinner = wins.B >= wins.A ? 'B' as const : 'A' as const;
              const winnerName = overallWinner === 'B' ? testB?.name : testA?.name;
              const winnerMetrics = overallWinner === 'B' ? metricsB! : metricsA!;
              const loserMetrics = overallWinner === 'B' ? metricsA! : metricsB!;

              const lines: string[] = [];
              const completionDelta = Math.abs(
                winnerMetrics.completionRate - loserMetrics.completionRate
              );
              if (completionDelta > 0) {
                lines.push(
                  `${completionDelta}% higher task completion rate`
                );
              }
              const durationDelta = Math.abs(
                loserMetrics.avgDuration - winnerMetrics.avgDuration
              );
              if (durationDelta > 10) {
                lines.push(
                  `${Math.round(durationDelta)}s shorter average session`
                );
              }
              if (winner!.deadZones === overallWinner &&
                winnerMetrics.deadZonesCount < loserMetrics.deadZonesCount) {
                lines.push(
                  `${loserMetrics.deadZonesCount - winnerMetrics.deadZonesCount} fewer confusion zones`
                );
              }
              if (
                winner!.firstClick === overallWinner &&
                winnerMetrics.firstClickAccuracy !== null &&
                loserMetrics.firstClickAccuracy !== null
              ) {
                const fcDelta = Math.abs(
                  winnerMetrics.firstClickAccuracy - loserMetrics.firstClickAccuracy
                );
                if (fcDelta > 0) {
                  lines.push(`${fcDelta}% better first-click accuracy`);
                }
              }
              const summary = lines.length > 0
                ? `It achieves ${lines.join(', ')}.`
                : 'It wins on the majority of measured metrics.';

              return (
                <div className="mt-4 flex gap-4 rounded-xl border border-[#ffd02f] bg-[#ffd02f]/10 p-6">
                  <Lightbulb className="flex-shrink-0 text-[#050038]" />
                  <div>
                    <p className="text-base text-[#050038] font-semibold mb-2">
                      Data-Driven Recommendation
                    </p>
                    <p className="text-sm text-[#050038]/80">
                      Based on {metricsA!.totalSessions + metricsB!.totalSessions} total sessions,{' '}
                      <strong>{winnerName}</strong> is the stronger design.
                      {' '}{summary}
                      {' '}Consider advancing this version to production.
                    </p>
                  </div>
                </div>
              );
            })()}
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
