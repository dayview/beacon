import React, { useState } from "react";
import { Toaster, toast } from "sonner";
import "../styles/fonts.css";
import { Dashboard } from "../screens/Dashboard";
import { LiveAnalytics } from "../screens/LiveAnalytics";
import { Comparison } from "../screens/Comparison";
import { TestSetupModal } from "../components/TestSetupModal";

function App() {
  const [currentScreen, setCurrentScreen] = useState<"dashboard" | "analytics" | "comparison">("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartTest = () => {
    setIsModalOpen(false);
    toast.success("Test started successfully!");
    setCurrentScreen("analytics");
  };

  return (
    <>
      <div className="min-h-screen font-sans text-[#050038] bg-[#fafafa] antialiased">
        {currentScreen === "dashboard" && (
          <Dashboard 
            onNavigate={(screen) => setCurrentScreen(screen as any)} 
            onOpenNewTest={() => setIsModalOpen(true)}
          />
        )}
        
        {currentScreen === "analytics" && (
          <LiveAnalytics onBack={() => setCurrentScreen("dashboard")} />
        )}

        {currentScreen === "comparison" && (
          <Comparison onBack={() => setCurrentScreen("dashboard")} />
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

export default App;
