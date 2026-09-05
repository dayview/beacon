import React, { useState, useEffect, Suspense, lazy } from "react";
import { Toaster, toast } from "sonner";
import "../styles/fonts.css";
import { TestSetupModal } from "../components/TestSetupModal";
import { TestProvider, useTests } from "../contexts/TestContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

// Each screen is its own chunk, loaded on first navigation to it rather than
// bundled into the initial load — only one is ever mounted at a time (see
// the currentScreen conditionals below), so there's nothing to gain from
// bundling them all together up front.
const Dashboard = lazy(() => import("../screens/Dashboard").then((m) => ({ default: m.Dashboard })));
const LiveAnalytics = lazy(() => import("../screens/LiveAnalytics").then((m) => ({ default: m.LiveAnalytics })));
const Comparison = lazy(() => import("../screens/Comparison").then((m) => ({ default: m.Comparison })));
const Boards = lazy(() => import("../screens/Boards").then((m) => ({ default: m.Boards })));
const BoardCanvas = lazy(() => import("../screens/BoardCanvas").then((m) => ({ default: m.BoardCanvas })));
const Settings = lazy(() => import("../screens/Settings").then((m) => ({ default: m.Settings })));
const Participate = lazy(() => import("../screens/Participate").then((m) => ({ default: m.Participate })));
const MiroPanel = lazy(() => import("../screens/MiroPanel").then((m) => ({ default: m.MiroPanel })));
const Templates = lazy(() => import("../screens/Templates").then((m) => ({ default: m.Templates })));

type Screen = "dashboard" | "analytics" | "comparison" | "boards" | "board-canvas" | "templates" | "settings" | "participate";

function AppLoadingFallback() {
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

function AppContent() {
  // Miro Web SDK panel — must render before any auth checks
  if (window.location.pathname === '/miro-panel') {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <MiroPanel />
      </Suspense>
    );
  }

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
      // Strip only the query string — preserve /dashboard/:token if that's
      // the current path, rather than bouncing back to '/'.
      window.history.replaceState({}, '', window.location.pathname);
      setCurrentScreen('boards');
    } else if (miroError) {
      toast.error('Failed to connect Miro. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
      setCurrentScreen('boards');
    }
  }, [refreshUser]);

  const handleSignOut = () => {
    logout();
    setCurrentScreen("dashboard");
  };

  const { addTest, selectTest } = useTests();

  const handleStartTest = (_testId: string) => {
    setIsModalOpen(false);
    setCurrentScreen("analytics");
  };

  const handleOpenBoard = async (boardId: string, boardName: string) => {
    try {
      const newTest = await addTest({
        name: `${boardName} Analysis`,
        description: '',
        status: 'live',
        type: 'live-session',
        participants: { current: 0, target: 20 },
        boardUrl: boardId,
      });

      setActiveBoardId(boardId);
      setActiveBoardName(boardName);
      setActiveTestId(newTest.id);
      selectTest(newTest.id);
      setCurrentScreen('board-canvas');
    } catch (err) {
      toast.error('Failed to initialize board analytics.');
      console.error(err);
    }
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  if (currentScreen === 'participate') {
    return (
      <Suspense fallback={<AppLoadingFallback />}>
        <Participate />
      </Suspense>
    );
  }

  // Show loading spinner while checking auth
  if (isLoading) {
    return <AppLoadingFallback />;
  }

  // Only reachable if the backend was unavailable when a session was being
  // provisioned — there's no login screen to fall back to, just retry.
  if (!isAuthenticated) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#050038] via-[#0a0050] to-[#1a0080] text-center">
          <div>
            <p className="text-sm text-white/60">Couldn't reach Beacon. Check your connection and try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-[#ffd02f] px-4 py-2 text-sm font-medium text-[#050038]"
            >
              Retry
            </button>
          </div>
        </div>
        <Toaster position="top-center" richColors />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen font-sans text-[#050038] bg-[#fafafa] antialiased">
        <Suspense fallback={<AppLoadingFallback />}>
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

          {currentScreen === "templates" && (
            <Templates onNavigate={handleNavigate} onSignOut={handleSignOut} />
          )}

          {currentScreen === "dashboard" && (
            <Dashboard
              onNavigate={handleNavigate}
              onOpenNewTest={() => setIsModalOpen(true)}
              onSignOut={handleSignOut}
            />
          )}

          {currentScreen === "analytics" && (
            <LiveAnalytics
              onBack={() => setCurrentScreen("dashboard")}
              onNavigate={handleNavigate}
            />
          )}

          {currentScreen === "comparison" && (
            <Comparison onBack={() => setCurrentScreen("dashboard")} />
          )}

          {currentScreen === "settings" && (
            <Settings onNavigate={handleNavigate} onSignOut={handleSignOut} />
          )}
        </Suspense>

        <TestSetupModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onStart={handleStartTest}
          onNavigateSettings={() => {
            setIsModalOpen(false);
            setCurrentScreen('settings');
          }}
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
