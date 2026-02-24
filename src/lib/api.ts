/**
 * Beacon API client — typed HTTP wrapper with JWT auth.
 */
/// <reference types="vite/client" />

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const TOKEN_KEY = 'beacon-token';

// ── Token management ────────────────────────────────────────
export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
}

// ── Core fetch wrapper ──────────────────────────────────────
async function request<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({}));

    // Handle 401 — token expired or invalid
    if (response.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/register')) {
        clearToken();
        window.dispatchEvent(new CustomEvent('beacon:auth-expired'));
        throw new ApiError('Session expired. Please log in again.', 401);
    }

    if (!response.ok) {
        // If it's a validation error, try to extract the specific details
        let errorMessage = data.error || `Request failed (${response.status})`;
        if (data.details && Array.isArray(data.details)) {
            errorMessage = data.details.map((d: any) => d.message).join(', ');
        }

        throw new ApiError(
            errorMessage,
            response.status,
            data
        );
    }

    return data as T;
}

// ── Error class ─────────────────────────────────────────────
export class ApiError extends Error {
    status: number;
    data?: unknown;

    constructor(message: string, status: number, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

// ── Typed API methods ───────────────────────────────────────
export const api = {
    get: <T>(url: string) => request<T>(url),

    post: <T>(url: string, body?: unknown) =>
        request<T>(url, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        }),

    patch: <T>(url: string, body?: unknown) =>
        request<T>(url, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        }),

    delete: <T>(url: string) =>
        request<T>(url, { method: 'DELETE' }),

    fetchAiInsights: (testId: string) =>
        request<{ insights: ApiAIInsight[] }>(`/api/ai/insights/${testId}`),

    fetchHeatmapProps: (testId: string) =>
        request<{ heatmaps: ApiHeatmap[] }>(`/api/heatmaps/${testId}`),
};

// ── API Type Definitions ────────────────────────────────────

export interface ApiUser {
    id: string;
    email: string;
    name: string;
    role: string;
    workspace: string | null;
    plan: {
        tier: 'free' | 'pro' | 'enterprise';
        aiProvider: string | null;
        recordingEnabled: boolean;
        hasAiKey: boolean;
    };
    hasMiroConnected: boolean;
    createdAt: string;
}

export interface ApiTest {
    _id: string;
    name: string;
    type?: 'solo' | 'live-session' | 'remote';
    board: { _id: string; name: string; miroId?: string; thumbnailUrl?: string } | string;
    researcher: string | { _id: string; name: string; email: string };
    status: 'draft' | 'active' | 'paused' | 'completed';
    tasks: { id: string; description: string; targetElement: string; successCriteria: string; order: number }[];
    settings: {
        recordScreen: boolean;
        captureEvents: boolean;
        maxParticipants: number;
        duration: number | null;
    };
    createdAt: string;
    startedAt: string | null;
    endedAt: string | null;
}

export interface ApiSession {
    _id: string;
    test: string;
    participant: { id: string | null; demographics: Record<string, unknown> };
    status: 'in_progress' | 'completed' | 'abandoned';
    events: ApiEvent[];
    metrics: {
        taskCompletionRate: number;
        timeOnTask: Record<string, unknown>;
        clickCount: number;
        pathEfficiency: number;
    };
    startedAt: string;
    completedAt: string | null;
}

export interface ApiEvent {
    type: 'click' | 'hover' | 'scroll' | 'task_complete';
    timestamp: string;
    coordinates: { x: number; y: number };
    element: string | null;
    metadata: Record<string, unknown>;
}

export interface ApiHeatmap {
    _id: string;
    test: string;
    board: string;
    type: 'click' | 'attention' | 'scroll';
    data: { x: number; y: number; intensity: number }[];
    generatedAt: string;
}

export interface ApiAIInsight {
    _id: string;
    test: string;
    session: string | null;
    provider: string;
    insights: {
        summary: string;
        patterns: string[];
        recommendations: string[];
        sentiment: string;
    };
    cost: number;
    generatedAt: string;
}

export interface ApiAnalyticsSummary {
    testId: string;
    totalSessions: number;
    confusion: {
        zones: { element: string; score: number; description: string }[];
        totalZones: number;
    };
    dwellTimes: { element: string; avgDwell: number; totalHovers: number }[];
    flow: {
        topPaths: { path: string[]; count: number; percentage: number }[];
        dropoffPoints: { element: string; dropoffRate: number }[];
    };
    scrollDepth: {
        avgMaxDepth: number;
        dropoffPoint: number;
        percentiles: Record<string, number>;
    };
}

export interface ApiMiroBoard {
    id: string;
    name: string;
    description: string;
    picture: { imageURL?: string } | null;
    createdAt: string;
    modifiedAt: string;
}

export interface ApiTemplate {
    _id: string;
    name: string;
    description: string;
    category: string;
    color: string;
    popular: boolean;
    miroBoardId?: string;
    thumbnailUrl?: string;
    createdAt: string;
}

export interface ApiTemplateCategory {
    name: string;
    count: number;
}

