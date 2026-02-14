export interface Test {
  id: string;
  name: string;
  description: string;
  status: 'live' | 'paused' | 'collecting' | 'completed';
  type: 'solo' | 'live-session' | 'remote';
  participants: {
    current: number;
    target: number;
  };
  createdAt: string;
  thumbnail?: string;
  boardUrl?: string;
  analytics?: TestAnalytics;
}

export interface TestAnalytics {
  totalClicks: number;
  totalSessions: number;
  avgDuration: number; // in seconds
  completionRate: number;
  heatmapData: HeatmapPoint[];
  clickData: ClickPoint[];
  sessionData: SessionData[];
}

export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
}

export interface ClickPoint {
  x: number;
  y: number;
  timestamp: number;
  element?: string;
}

export interface SessionData {
  id: string;
  participantName: string;
  duration: number;
  clicks: number;
  completed: boolean;
  timestamp: string;
}

// Initial mock tests
export const initialTests: Test[] = [
  {
    id: '1',
    name: 'Mobile App Prototype v2',
    description: 'Testing new onboarding flow for mobile app',
    status: 'live',
    type: 'solo',
    participants: { current: 12, target: 20 },
    createdAt: '2026-02-12T10:00:00Z',
    analytics: {
      totalClicks: 342,
      totalSessions: 12,
      avgDuration: 245,
      completionRate: 83,
      heatmapData: generateMockHeatmap(),
      clickData: generateMockClicks(342),
      sessionData: generateMockSessions(12)
    }
  },
  {
    id: '2',
    name: 'Dashboard Redesign A/B',
    description: 'Comparing two dashboard layouts',
    status: 'paused',
    type: 'live-session',
    participants: { current: 8, target: 10 },
    createdAt: '2026-02-10T14:30:00Z',
    analytics: {
      totalClicks: 156,
      totalSessions: 8,
      avgDuration: 189,
      completionRate: 75,
      heatmapData: generateMockHeatmap(),
      clickData: generateMockClicks(156),
      sessionData: generateMockSessions(8)
    }
  },
  {
    id: '3',
    name: 'New Checkout Flow',
    description: 'Testing streamlined checkout process',
    status: 'collecting',
    type: 'solo',
    participants: { current: 45, target: 50 },
    createdAt: '2026-02-08T09:15:00Z',
    analytics: {
      totalClicks: 1023,
      totalSessions: 45,
      avgDuration: 312,
      completionRate: 91,
      heatmapData: generateMockHeatmap(),
      clickData: generateMockClicks(1023),
      sessionData: generateMockSessions(45)
    }
  }
];

// Helper functions to generate realistic mock data
function generateMockHeatmap(): HeatmapPoint[] {
  const points: HeatmapPoint[] = [];
  for (let i = 0; i < 50; i++) {
    points.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      intensity: Math.random()
    });
  }
  return points;
}

function generateMockClicks(count: number): ClickPoint[] {
  const clicks: ClickPoint[] = [];
  const elements = ['button-primary', 'nav-item', 'card', 'link', 'input-field'];
  
  for (let i = 0; i < Math.min(count, 100); i++) {
    clicks.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      timestamp: Date.now() - Math.random() * 86400000,
      element: elements[Math.floor(Math.random() * elements.length)]
    });
  }
  return clicks;
}

function generateMockSessions(count: number): SessionData[] {
  const sessions: SessionData[] = [];
  const names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn'];
  
  for (let i = 0; i < count; i++) {
    sessions.push({
      id: `session-${i + 1}`,
      participantName: `${names[i % names.length]} ${i + 1}`,
      duration: Math.floor(Math.random() * 400) + 100,
      clicks: Math.floor(Math.random() * 50) + 10,
      completed: Math.random() > 0.2,
      timestamp: new Date(Date.now() - Math.random() * 604800000).toISOString()
    });
  }
  return sessions;
}
