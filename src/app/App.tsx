import React, { useState } from "react";
import { Toaster, toast } from "sonner";
import "../styles/fonts.css";
import { Dashboard } from "../screens/Dashboard";
import { LiveAnalytics } from "../screens/LiveAnalytics";
import { Comparison } from "../screens/Comparison";
import { Boards } from "../screens/Boards";
import { Templates } from "../screens/Templates";
import { Settings } from "../screens/Settings";
import { TestSetupModal } from "../components/TestSetupModal";
import { TestProvider } from "../contexts/TestContext";

type Screen = "dashboard" | "analytics" | "comparison" | "boards" | "templates" | "settings";

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartTest = () => {
    setIsModalOpen(false);
    toast.success("Test started successfully!");
  };

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen as Screen);
  };

  return (
    <TestProvider>
      <div className="min-h-screen font-sans text-[#050038] bg-[#fafafa] antialiased">
        {currentScreen === "boards" && (
          <Boards onNavigate={handleNavigate} />
        )}

        {currentScreen === "templates" && (
          <Templates onNavigate={handleNavigate} />
        )}

        {currentScreen === "dashboard" && (
          <Dashboard 
            onNavigate={handleNavigate} 
            onOpenNewTest={() => setIsModalOpen(true)}
          />
        )}
        
        {currentScreen === "analytics" && (
          <LiveAnalytics onBack={() => setCurrentScreen("dashboard")} />
        )}

        {currentScreen === "comparison" && (
          <Comparison onBack={() => setCurrentScreen("dashboard")} />
        )}

        {currentScreen === "settings" && (
          <Settings onNavigate={handleNavigate} />
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

export default App;
