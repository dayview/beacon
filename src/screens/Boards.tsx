import React from "react";
import { Plus, Grid, List, Search, Filter, Clock } from "lucide-react";
import { Button } from "../components/ui/Button";

interface BoardsProps {
  onNavigate: (screen: string) => void;
}

export const Boards: React.FC<BoardsProps> = ({ onNavigate }) => {
  const mockBoards = [
    { id: 1, name: "Mobile App Wireframes", updated: "2 hours ago", thumbnail: "#4262ff" },
    { id: 2, name: "Website Redesign", updated: "Yesterday", thumbnail: "#ffd02f" },
    { id: 3, name: "User Flow Diagrams", updated: "3 days ago", thumbnail: "#ef4444" },
    { id: 4, name: "Design System", updated: "1 week ago", thumbnail: "#10b981" },
    { id: 5, name: "Sprint Planning", updated: "2 weeks ago", thumbnail: "#8b5cf6" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-white px-8 shadow-sm border-b border-[#050038]/10">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-bold tracking-tight text-[#050038]">miro</span>
          <nav className="flex gap-8">
            <button className="text-sm font-semibold text-[#4262ff]">Boards</button>
            <button onClick={() => onNavigate('templates')} className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Templates</button>
            <button onClick={() => onNavigate('dashboard')} className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Analytics</button>
            <button onClick={() => onNavigate('settings')} className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Settings</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-[#fafafa] overflow-hidden border border-[#050038]/10 cursor-pointer">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" alt="User" className="h-full w-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-[32px] font-bold text-[#050038]">My Boards</h1>
              <p className="text-sm text-[#050038]/60 mt-2">All your collaborative boards in one place</p>
            </div>
            <Button variant="primary">
              <Plus size={18} className="mr-2" />
              Create Board
            </Button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#050038]/40" />
                <input
                  type="text"
                  placeholder="Search boards..."
                  className="pl-10 pr-4 py-2 rounded-lg border border-[#050038]/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4262ff] w-[300px]"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#050038]/10 bg-white text-sm font-medium text-[#050038] hover:bg-[#fafafa]">
                <Filter size={16} />
                Filter
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-[#4262ff]/10 text-[#4262ff]">
                <Grid size={20} />
              </button>
              <button className="p-2 rounded-lg text-[#050038]/60 hover:bg-[#fafafa]">
                <List size={20} />
              </button>
            </div>
          </div>

          {/* Boards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mockBoards.map((board) => (
              <div
                key={board.id}
                className="group cursor-pointer rounded-xl bg-white p-4 shadow-[0px_2px_8px_rgba(5,0,56,0.08)] transition-all hover:shadow-[0px_4px_16px_rgba(5,0,56,0.12)]"
              >
                <div 
                  className="aspect-video w-full rounded-lg mb-4 flex items-center justify-center text-white font-semibold text-lg"
                  style={{ backgroundColor: board.thumbnail }}
                >
                  {board.name.charAt(0)}
                </div>
                <h3 className="font-semibold text-[#050038] mb-2">{board.name}</h3>
                <div className="flex items-center gap-2 text-sm text-[#050038]/60">
                  <Clock size={14} />
                  <span>{board.updated}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
