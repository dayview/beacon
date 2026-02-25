import React, { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import "../styles/fonts.css";
import { Login } from "../screens/Login";
import { Dashboard } from "../screens/Dashboard";
import { LiveAnalytics } from "../screens/LiveAnalytics";
import { Comparison } from "../screens/Comparison";
import { Boards } from "../screens/Boards";
import { BoardCanvas } from "../screens/BoardCanvas";
import { Templates } from "../screens/Templates";
import { Settings } from "../screens/Settings";
import { Participate } from "../screens/Participate";
import { TestSetupModal } from "../components/TestSetupModal";
import { TestProvider, useTests } from "../contexts/TestContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { api, ApiTest } from "../lib/api";

type Screen = "dashboard" | "analytics" | "comparison" | "boards" | "board-canvas" | "templates" | "settings" | "participate";

function AppContent() {
  const { isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>(window.location.pathname === '/participate' ? "participate" : "dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeBoardName, setActiveBoardName] = useState("");
  const [activeBoardId, setActiveBoardId] = useState("");
  const [activeTestId, setActiveTestId] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const miroConnected = params.get('miro_connected');
    const miroError = params.get('miro_error');

    if (miroConnected) {
      refreshUser();
      toast.success('Miro connected successfully!');
      window.history.replaceState({}, '', '/');
      setCurrentScreen('boards');
    } else if (miroError) {
      toast.error('Failed to connect Miro. Please try again.');
      window.history.replaceState({}, '', '/');
      setCurrentScreen('boards');
    }
  }, [refreshUser]);

  const handleSignOut = () => {
    logout();
    setCurrentScreen("dashboard");
  };

  const handleStartTest = () => {
    setIsModalOpen(false);
    setCurrentScreen("analytics");
  };

  const { addTest, selectTest } = useTests();

  const handleOpenBoard = async (boardId: string, boardName: string) => {
    try {
      // 1. Instantly create a test for this board in the background
      const data = await api.post<{ test: ApiTest }>('/api/tests', {
        name: `${boardName} Analysis`,
        board: boardId,
        settings: { maxParticipants: 20 },
      });

      // 2. Add it to context and select it
      // Using an internal shape to match context's Test
      const newTest = {
        name: data.test.name,
        description: data.test.tasks?.[0]?.description || '',
        status: 'live' as const,
        type: 'live-session' as const,
        participants: { current: 0, target: 20 },
        boardUrl: boardId
      };

      await addTest({
        name: `${boardName} Analysis`,
        description: '',
        status: 'live',
        type: 'live-session',
        participants: { current: 0, target: 20 },
        boardUrl: boardId
      });

      setActiveBoardId(boardId);
      setActiveBoardName(boardName);
      setActiveTestId(data.test._id);

      // Wait a moment for test context to sync, then push to board-canvas
      setTimeout(() => {
        selectTest(data.test._id);
        setCurrentScreen("board-canvas");
      }, 500);

    } catch (err) {
      toast.error("Failed to initialize board analytics. Please use the 'New Test' button.");
      console.error(err);
    }
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  if (currentScreen === 'participate') {
    return <Participate />;
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#050038] via-[#0a0050] to-[#1a0080]">
        <div className="text-center">
          <svg className="mx-auto h-8 w-8 animate-spin text-[#ffd02f]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="mt-4 text-sm text-white/60">Loading Beacon...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen font-sans text-[#050038] bg-[#fafafa] antialiased">
        {currentScreen === "boards" && (
          <Boards onNavigate={handleNavigate} onOpenBoard={(id: string, name: string) => { handleOpenBoard(id, name); }} onSignOut={handleSignOut} />
        )}

        {currentScreen === "board-canvas" && (
          <BoardCanvas
            boardName={activeBoardName}
            boardId={activeBoardId}
            testId={activeTestId}
            onBack={() => setCurrentScreen("boards")}
          />
        )}

        {/* Templates completely disabled for Review
        {currentScreen === "templates" && (
          <Templates onNavigate={handleNavigate} onSignOut={handleSignOut} />
        )}
        */}

        {currentScreen === "dashboard" && (
          <Dashboard
            onNavigate={handleNavigate}
            onOpenNewTest={() => setIsModalOpen(true)}
            onSignOut={handleSignOut}
          />
        )}

        {currentScreen === "analytics" && (
          <LiveAnalytics onBack={() => setCurrentScreen("dashboard")} />
        )}

        {currentScreen === "comparison" && (
          <Comparison onBack={() => setCurrentScreen("dashboard")} />
        )}

        {currentScreen === "settings" && (
          <Settings onNavigate={handleNavigate} onSignOut={handleSignOut} />
        )}

        <TestSetupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onStart={handleStartTest}
        />
      </div>
      <Toaster position="top-center" richColors />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <TestProvider>
        <AppContent />
      </TestProvider>
    </AuthProvider>
  );
}

export default App;
