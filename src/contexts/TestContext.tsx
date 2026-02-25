import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api, ApiTest, ApiError } from '../lib/api';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

/** Adapter: converts backend ApiTest to a shape the existing UI understands */
export interface Test {
  id: string;
  _id?: string;
  name: string;
  description: string;
  status: 'live' | 'paused' | 'collecting' | 'completed' | 'draft';
  type: 'solo' | 'live-session' | 'remote';
  participants: { current: number; target: number };
  createdAt: string;
  thumbnail?: string;
  boardUrl?: string;
  startWidgetId?: string;
  analytics?: TestAnalytics;
}

export interface TestAnalytics {
  totalClicks: number;
  totalSessions: number;
  avgDuration: number;
  completionRate: number;
  heatmapData: HeatmapPoint[];
}

export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
}

interface TestContextType {
  tests: Test[];
  selectedTest: Test | null;
  isLoading: boolean;
  addTest: (test: Omit<Test, 'id' | 'createdAt'>) => Promise<Test>;
  updateTest: (id: string, updates: Partial<Test>) => void;
  deleteTest: (id: string) => void;
  selectTest: (id: string) => void;
  changeTestStatus: (id: string, status: Test['status']) => void;
  refreshTests: () => Promise<void>;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export const useTests = () => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTests must be used within a TestProvider');
  }
  return context;
};

/** Map backend test model to our frontend Test shape */
function mapApiTestToTest(t: ApiTest): Test {
  const statusMap: Record<string, Test['status']> = {
    draft: 'draft',
    active: 'live',
    paused: 'paused',
    completed: 'completed',
  };

  let startWidgetId = undefined;
  if (typeof t.board === 'object' && Array.isArray((t.board as any).elements) && (t.board as any).elements.length > 0) {
    const elements = (t.board as any).elements;
    const firstFrame = elements.find((e: any) => e.type === 'frame');
    startWidgetId = firstFrame ? firstFrame.miroId : elements[0].miroId;
  }

  return {
    id: t._id,
    _id: t._id,
    name: t.name,
    description: t.tasks?.[0]?.description || '',
    status: statusMap[t.status] || 'draft',
    type: t.type || 'solo',
    participants: {
      current: 0,
      target: t.settings?.maxParticipants || 10,
    },
    createdAt: t.createdAt,
    thumbnail: typeof t.board === 'object' ? t.board.thumbnailUrl : undefined,
    boardUrl: typeof t.board === 'object' ? t.board.miroId : (typeof t.board === 'string' ? t.board : undefined),
    startWidgetId,
  };
}

export const TestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTests = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await api.get<{ tests: ApiTest[] }>('/api/tests');
      setTests(data.tests.map(mapApiTestToTest));

      // Enrich tests with real session counts for comparison filter
      try {
        const testIdList = data.tests.map(t => t._id);
        if (testIdList.length > 0) {
          const { counts } = await api.fetchBatchSessionCounts(testIdList);
          setTests(prev =>
            prev.map(t => ({
              ...t,
              analytics: {
                totalSessions: counts[t.id] ?? 0,
                totalClicks: 0,
                avgDuration: 0,
                completionRate: 0,
                heatmapData: [],
              },
            }))
          );
        }
      } catch {
        // Non-fatal — comparison filter falls back to empty state
      }
    } catch (err) {
      console.warn('[TestContext] Failed to fetch tests from API, using empty state:', err);
      // Don't toast on every load failure — user sees empty dashboard
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const addTest = useCallback(async (test: Omit<Test, 'id' | 'createdAt'>) => {
    const data = await api.post<{ test: ApiTest }>('/api/tests', {
      name: test.name,
      type: test.type,
      status: test.status === 'live' ? 'active' : 'draft',
      tasks: test.description ? [{ description: test.description, order: 0 }] : [],
      settings: { maxParticipants: test.participants?.target || 10 },
      board: test.boardUrl,
    });
    const newTest = mapApiTestToTest(data.test);
    setTests((prev) => [newTest, ...prev]);
    setSelectedTest(newTest);
    return newTest;
  }, []);

  const updateTest = useCallback(async (id: string, updates: Partial<Test>) => {
    try {
      const patchBody: Record<string, unknown> = {};
      if (updates.name) patchBody.name = updates.name;
      if (updates.status) {
        const reverseMap: Record<string, string> = { live: 'active', paused: 'paused', completed: 'completed', draft: 'draft', collecting: 'active' };
        patchBody.status = reverseMap[updates.status] || updates.status;
      }
      const data = await api.patch<{ test: ApiTest }>(`/api/tests/${id}`, patchBody);
      const newMappedTest = mapApiTestToTest(data.test);

      setTests((prev) => prev.map((t) => {
        if (t.id === id) {
          return { ...newMappedTest, analytics: t.analytics };
        }
        return t;
      }));

      setSelectedTest((prev) => {
        if (prev?.id === id) {
          return { ...newMappedTest, analytics: prev.analytics };
        }
        return prev;
      });
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to update test');
    }
  }, []);

  const deleteTest = useCallback(async (id: string) => {
    try {
      await api.delete<{ success: boolean }>(`/api/tests/${id}`);
      setTests((prev) => prev.filter((t) => t.id !== id));
      if (selectedTest?.id === id) setSelectedTest(null);
      toast.success('Test deleted');
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to delete test');
    }
  }, [selectedTest]);

  const selectTest = useCallback((id: string) => {
    setSelectedTest(tests.find((t) => t.id === id) || null);
  }, [tests]);

  const changeTestStatus = useCallback(async (id: string, status: Test['status']) => {
    await updateTest(id, { status });
  }, [updateTest]);

  return (
    <TestContext.Provider
      value={{
        tests,
        selectedTest,
        isLoading,
        addTest,
        updateTest,
        deleteTest,
        selectTest,
        changeTestStatus,
        refreshTests: fetchTests,
      }}
    >
      {children}
    </TestContext.Provider>
  );
};
