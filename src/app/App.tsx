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
import { TestSetupModal } from "../components/TestSetupModal";
import { TestProvider } from "../contexts/TestContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

type Screen = "dashboard" | "analytics" | "comparison" | "boards" | "board-canvas" | "templates" | "settings";

function AppContent() {
  const { isAuthenticated, isLoading, logout, refreshUser } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeBoardName, setActiveBoardName] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const miroConnected = params.get('miro_connected');
    const miroError = params.get('miro_error');

    if (miroConnected) {
      refreshUser();
      toast.success('Miro connected successfully!');
      window.history.replaceState({}, '', '/');
      setCurrentScreen('settings');
    } else if (miroError) {
      toast.error('Failed to connect Miro. Please try again.');
      window.history.replaceState({}, '', '/');
      setCurrentScreen('settings');
    }
  }, [refreshUser]);

  const handleSignOut = () => {
    logout();
    setCurrentScreen("dashboard");
  };

  const handleStartTest = () => {
    setIsModalOpen(false);
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  const handleOpenBoard = (boardName: string) => {
    setActiveBoardName(boardName);
    setCurrentScreen("board-canvas");
  };

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
    <TestProvider>
      <div className="min-h-screen font-sans text-[#050038] bg-[#fafafa] antialiased">
        {currentScreen === "boards" && (
          <Boards onNavigate={handleNavigate} onOpenBoard={handleOpenBoard} onSignOut={handleSignOut} />
        )}

        {currentScreen === "board-canvas" && (
          <BoardCanvas
            boardName={activeBoardName}
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
    </TestProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
