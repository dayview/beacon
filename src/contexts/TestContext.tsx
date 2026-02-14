import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Test, initialTests } from '../data/mockData';
import { toast } from 'sonner';

interface TestContextType {
  tests: Test[];
  selectedTest: Test | null;
  addTest: (test: Omit<Test, 'id' | 'createdAt'>) => void;
  updateTest: (id: string, updates: Partial<Test>) => void;
  deleteTest: (id: string) => void;
  selectTest: (id: string) => void;
  changeTestStatus: (id: string, status: Test['status']) => void;
}

const TestContext = createContext<TestContextType | undefined>(undefined);

export const useTests = () => {
  const context = useContext(TestContext);
  if (!context) {
    throw new Error('useTests must be used within a TestProvider');
  }
  return context;
};

interface TestProviderProps {
  children: ReactNode;
}

export const TestProvider: React.FC<TestProviderProps> = ({ children }) => {
  // Load tests from localStorage or use initial data
  const [tests, setTests] = useState<Test[]>(() => {
    const saved = localStorage.getItem('beacon-tests');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved tests:', e);
        return initialTests;
      }
    }
    return initialTests;
  });

  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  // Persist tests to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('beacon-tests', JSON.stringify(tests));
  }, [tests]);

  const addTest = (testData: Omit<Test, 'id' | 'createdAt'>) => {
    const newTest: Test = {
      ...testData,
      id: `test-${Date.now()}`,
      createdAt: new Date().toISOString(),
      analytics: {
        totalClicks: 0,
        totalSessions: 0,
        avgDuration: 0,
        completionRate: 0,
        heatmapData: [],
        clickData: [],
        sessionData: []
      }
    };
    setTests(prev => [newTest, ...prev]);
    toast.success(`Test "${newTest.name}" created successfully!`);
  };

  const updateTest = (id: string, updates: Partial<Test>) => {
    setTests(prev => prev.map(test => 
      test.id === id ? { ...test, ...updates } : test
    ));
    toast.success('Test updated successfully!');
  };

  const deleteTest = (id: string) => {
    const test = tests.find(t => t.id === id);
    setTests(prev => prev.filter(test => test.id !== id));
    toast.success(`Test "${test?.name}" deleted successfully!`);
  };

  const selectTest = (id: string) => {
    const test = tests.find(t => t.id === id);
    setSelectedTest(test || null);
  };

  const changeTestStatus = (id: string, status: Test['status']) => {
    setTests(prev => prev.map(test => 
      test.id === id ? { ...test, status } : test
    ));
    
    const statusMessages: Record<Test['status'], string> = {
      live: 'Test is now live!',
      paused: 'Test paused',
      collecting: 'Collecting data...',
      completed: 'Test completed'
    };
    
    toast.success(statusMessages[status]);
  };

  return (
    <TestContext.Provider
      value={{
        tests,
        selectedTest,
        addTest,
        updateTest,
        deleteTest,
        selectTest,
        changeTestStatus
      }}
    >
      {children}
    </TestContext.Provider>
  );
};
