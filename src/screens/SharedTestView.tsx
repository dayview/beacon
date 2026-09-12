import React, { useState, useEffect } from 'react';
import { api, ApiSharedStats, ApiError } from '../lib/api';

function formatDuration(seconds: number): string {
    if (seconds <= 0) return '0s';
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
}

export const SharedTestView: React.FC = () => {
    const [stats, setStats] = useState<ApiSharedStats | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const params = new URLSearchParams(window.location.search);
    const testId = params.get('testId');
    const token = params.get('token');

    useEffect(() => {
        if (!testId || !token) {
            setError('This link is missing required information.');
            setIsLoading(false);
            return;
        }
        api.fetchSharedStats(testId, token)
            .then(setStats)
            .catch((err) => {
                setError(err instanceof ApiError ? err.message : "Couldn't load this shared link.");
            })
            .finally(() => setIsLoading(false));
    }, [testId, token]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fafafa] text-[#050038]/60">
                Loading...
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-large text-center text-[#050038]/60">
                {error || 'Shared link not found or no longer valid.'}
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-large">
            <div className="w-full max-w-md rounded-xl border border-[#050038]/10 bg-white p-8 shadow-sm">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#050038]/40">Shared analytics · read-only</p>
                <h1 className="mb-6 text-xl font-semibold text-[#050038]">{stats.name}</h1>
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-[#fafafa] p-4">
                        <p className="text-xs text-[#050038]/60">Total sessions</p>
                        <p className="text-2xl font-semibold text-[#050038]">{stats.totalSessions}</p>
                    </div>
                    <div className="rounded-lg bg-[#fafafa] p-4">
                        <p className="text-xs text-[#050038]/60">Completed</p>
                        <p className="text-2xl font-semibold text-[#050038]">{stats.completedSessions}</p>
                    </div>
                    <div className="rounded-lg bg-[#fafafa] p-4">
                        <p className="text-xs text-[#050038]/60">Completion rate</p>
                        <p className="text-2xl font-semibold text-[#050038]">{stats.completionRate}%</p>
                    </div>
                    <div className="rounded-lg bg-[#fafafa] p-4">
                        <p className="text-xs text-[#050038]/60">Avg. duration</p>
                        <p className="text-2xl font-semibold text-[#050038]">{formatDuration(stats.avgDuration)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
