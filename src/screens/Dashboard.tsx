import React from "react";
import { Plus, GitCompare, User, Play, Pause, Square, MoreHorizontal, ArrowRight, Clock, Users, Calendar } from "lucide-react";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";

interface DashboardProps {
  onNavigate: (screen: string) => void;
  onOpenNewTest: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenNewTest }) => {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      {/* Top Navigation Bar */}
      <header className="flex h-16 items-center justify-between bg-white px-8 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
             {/* Miro Logo Placeholder */}
            <span className="text-2xl font-bold tracking-tight text-[#050038]">miro</span>
          </div>
          <nav className="flex gap-8">
            <a href="#" className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Boards</a>
            <a href="#" className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Templates</a>
            <a href="#" className="text-sm font-semibold text-[#4262ff]">Analytics</a>
            <a href="#" className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Settings</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="h-8 w-8 rounded-full bg-[#fafafa] overflow-hidden border border-[#050038]/10">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" alt="User" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div>
            <h1 className="text-[32px] font-bold leading-[40px] text-[#050038]">Beacon Analytics</h1>
            <p className="mt-2 text-sm text-[#050038]/60">Track prototype testing and user behavior insights</p>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 border-b border-[#050038]/10">
            <div className="flex gap-8">
              <button className="border-b-2 border-[#4262ff] pb-3 text-sm font-semibold text-[#050038]">
                My Tests
              </button>
              <button className="pb-3 text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">
                Archived
              </button>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="mt-6 flex items-center gap-4">
            <button 
                onClick={onOpenNewTest}
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#ffd02f] px-6 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#ffd02f]/90 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Test
            </button>
            <button 
                onClick={() => onNavigate("comparison")}
                className="inline-flex h-10 items-center justify-center rounded-md border border-[#050038]/10 bg-white px-6 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#fafafa] shadow-sm"
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Compare Tests
            </button>
          </div>

          {/* Test Cards Grid */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Active Test */}
            <div className="group relative flex flex-col overflow-hidden rounded-xl bg-white p-6 shadow-[0px_2px_8px_rgba(5,0,56,0.08)] transition-shadow hover:shadow-[0px_4px_16px_rgba(5,0,56,0.12)]">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#fafafa]">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#fafafa_25%,transparent_25%,transparent_75%,#fafafa_75%,#fafafa),linear-gradient(45deg,#fafafa_25%,transparent_25%,transparent_75%,#fafafa_75%,#fafafa)] bg-[length:20px_20px] opacity-50"></div>
                {/* Mock Thumbnail Content */}
                <div className="absolute inset-4 flex items-center justify-center rounded border border-dashed border-[#050038]/20">
                    <span className="text-[#050038]/40 text-xs">Mobile App Prototype Preview</span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center rounded-full bg-[#4262ff] px-3 py-1 text-xs font-semibold text-white">
                    <span className="mr-1.5 h-2 w-2 rounded-full bg-white"></span>
                    Live
                  </span>
                </div>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-[#050038]">Mobile App Prototype v2</h3>
              
              <div className="mt-2 flex items-center gap-4 text-sm text-[#050038]/60">
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span>Solo Test</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>12/20</span>
                </div>
              </div>
               <div className="mt-1 flex items-center gap-1.5 text-sm text-[#050038]/60">
                  <Calendar size={14} />
                  <span>Started Feb 12</span>
               </div>

              <div className="mt-6 flex items-center gap-2">
                <button 
                    onClick={() => onNavigate("analytics")}
                    className="flex-1 rounded-md bg-[#ffd02f] px-3 py-2 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#ffd02f]/90"
                >
                  View Results
                </button>
                <button className="rounded-md border border-[#050038]/10 bg-white px-3 py-2 text-sm font-semibold text-[#050038]/60 transition-colors hover:bg-[#fafafa] hover:text-[#050038]">
                  Edit
                </button>
                <button className="rounded-md px-3 py-2 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#fafafa]/50">
                  Stop
                </button>
              </div>
            </div>

            {/* Card 2: Paused Test */}
            <div className="group relative flex flex-col overflow-hidden rounded-xl bg-white p-6 shadow-[0px_2px_8px_rgba(5,0,56,0.08)] transition-shadow hover:shadow-[0px_4px_16px_rgba(5,0,56,0.12)]">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#fafafa]">
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,#fafafa_25%,transparent_25%,transparent_75%,#fafafa_75%,#fafafa),linear-gradient(45deg,#fafafa_25%,transparent_25%,transparent_75%,#fafafa_75%,#fafafa)] bg-[length:20px_20px] opacity-50"></div>
                 <div className="absolute inset-4 flex items-center justify-center rounded border border-dashed border-[#050038]/20">
                    <span className="text-[#050038]/40 text-xs">Web Dashboard Preview</span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center rounded-full bg-[#ffd02f] px-3 py-1 text-xs font-semibold text-[#050038]">
                    <Pause size={10} className="mr-1 fill-current" />
                    Paused
                  </span>
                </div>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-[#050038]">Dashboard Redesign A/B</h3>
              
              <div className="mt-2 flex items-center gap-4 text-sm text-[#050038]/60">
                <div className="flex items-center gap-1.5">
                  <Users size={14} />
                  <span>Live Session</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>8/10</span>
                </div>
              </div>
               <div className="mt-1 flex items-center gap-1.5 text-sm text-[#050038]/60">
                  <Calendar size={14} />
                  <span>Started Feb 10</span>
               </div>

              <div className="mt-6 flex items-center gap-2">
                <button className="flex-1 rounded-md bg-[#ffd02f] px-3 py-2 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#ffd02f]/90">
                  View Results
                </button>
                <button className="rounded-md border border-[#050038]/10 bg-white px-3 py-2 text-sm font-semibold text-[#050038]/60 transition-colors hover:bg-[#fafafa] hover:text-[#050038]">
                  Edit
                </button>
                 <button className="rounded-md px-3 py-2 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#fafafa]/50">
                  Stop
                </button>
              </div>
            </div>

            {/* Card 3: Collecting Data */}
            <div className="group relative flex flex-col overflow-hidden rounded-xl bg-white p-6 shadow-[0px_2px_8px_rgba(5,0,56,0.08)] transition-shadow hover:shadow-[0px_4px_16px_rgba(5,0,56,0.12)]">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#fafafa]">
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,#fafafa_25%,transparent_25%,transparent_75%,#fafafa_75%,#fafafa),linear-gradient(45deg,#fafafa_25%,transparent_25%,transparent_75%,#fafafa_75%,#fafafa)] bg-[length:20px_20px] opacity-50"></div>
                 <div className="absolute inset-4 flex items-center justify-center rounded border border-dashed border-[#050038]/20">
                    <span className="text-[#050038]/40 text-xs">Checkout Flow Preview</span>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="inline-flex items-center rounded-full bg-[#4262ff]/10 px-3 py-1 text-xs font-semibold text-[#4262ff]">
                    <Clock size={12} className="mr-1" />
                    Collecting
                  </span>
                </div>
              </div>

              <h3 className="mt-4 text-lg font-semibold text-[#050038]">New Checkout Flow</h3>
              
              <div className="mt-2 flex items-center gap-4 text-sm text-[#050038]/60">
                <div className="flex items-center gap-1.5">
                  <User size={14} />
                  <span>Solo Test</span>
                </div>
                 <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>45/50</span>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-[#050038]/60">
                  <Calendar size={14} />
                  <span>Started Feb 08</span>
               </div>

              <div className="mt-6 flex items-center gap-2">
                <button className="flex-1 rounded-md bg-[#ffd02f] px-3 py-2 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#ffd02f]/90">
                  View Results
                </button>
                <button className="rounded-md border border-[#050038]/10 bg-white px-3 py-2 text-sm font-semibold text-[#050038]/60 transition-colors hover:bg-[#fafafa] hover:text-[#050038]">
                  Edit
                </button>
                 <button className="rounded-md px-3 py-2 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#fafafa]/50">
                  Stop
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
