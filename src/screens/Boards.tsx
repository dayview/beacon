import React, { useState, useEffect, useCallback } from "react";
import { Plus, Grid, List, Search, Clock, X, Loader2, Link2, Settings } from "lucide-react";
import { Button } from "../components/ui/Button";
import { UserProfileModal } from "../components/UserProfileModal";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { api, ApiMiroBoard } from "../lib/api";

interface BoardsProps {
  onNavigate: (screen: string) => void;
  onOpenBoard: (boardName: string) => void;
  onSignOut: () => void;
}

/** Compute a deterministic color from a board name for the fallback thumbnail */
const BOARD_COLORS = ["#4262ff", "#ffd02f", "#ef4444", "#10b981", "#8b5cf6"];
function boardColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return BOARD_COLORS[Math.abs(hash) % BOARD_COLORS.length];
}

/** Format an ISO date string to a human-readable relative time */
function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export const Boards: React.FC<BoardsProps> = ({ onNavigate, onOpenBoard, onSignOut }) => {
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [boards, setBoards] = useState<ApiMiroBoard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const hasMiro = user?.hasMiroConnected ?? false;

  // Fetch boards from Miro API
  const fetchBoards = useCallback(async () => {
    if (!hasMiro) return;
    setIsLoading(true);
    try {
      const data = await api.get<{ boards: ApiMiroBoard[] }>("/api/miro/boards");
      setBoards(data.boards);
    } catch {
      toast.error("Failed to load Miro boards.");
    } finally {
      setIsLoading(false);
    }
  }, [hasMiro]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const filteredBoards = boards.filter(board =>
    board.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateBoard = () => {
    // Creating a Miro board requires the Miro UI — redirect user
    window.open("https://miro.com/app/dashboard/", "_blank");
    toast.info("Create your board in Miro, then refresh this page.");
  };

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
          <button onClick={() => setIsProfileOpen(true)} className="h-8 w-8 rounded-full bg-[#fafafa] overflow-hidden border border-[#050038]/10 cursor-pointer hover:border-[#4262ff] transition-colors">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" alt="User" className="h-full w-full object-cover" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-[32px] font-bold text-[#050038]">My Boards</h1>
              <p className="text-sm text-[#050038]/60 mt-2">
                {hasMiro ? "Your Miro boards synced to Beacon" : "Connect Miro to see your boards"}
              </p>
            </div>
            {hasMiro && (
              <Button variant="primary" onClick={handleCreateBoard}>
                <Plus size={18} className="mr-2" />
                Create Board
              </Button>
            )}
          </div>

          {/* ── Miro Not Connected State ─────────────────────── */}
          {!hasMiro && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#050038]/10 bg-white p-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#4262ff]/10 mb-6">
                <Link2 size={28} className="text-[#4262ff]" />
              </div>
              <h3 className="text-xl font-semibold text-[#050038] mb-2">Connect Your Miro Account</h3>
              <p className="text-sm text-[#050038]/60 text-center max-w-md mb-8">
                Link your Miro account to import boards, run usability tests, and track analytics — all within Beacon.
              </p>
              <Button variant="primary" onClick={() => onNavigate("settings")}>
                <Settings size={16} className="mr-2" />
                Go to Settings
              </Button>
            </div>
          )}

          {/* ── Loading State ────────────────────────────────── */}
          {hasMiro && isLoading && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-[#4262ff] mb-4" />
              <p className="text-sm text-[#050038]/60">Loading your Miro boards...</p>
            </div>
          )}

          {/* ── Boards Content (when Miro is connected & loaded) */}
          {hasMiro && !isLoading && (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#050038]/40" />
                    <input
                      type="text"
                      placeholder="Search boards..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 rounded-lg border border-[#050038]/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4262ff] w-[300px]"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#050038]/40 hover:text-[#050038]"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-[#4262ff]/10 text-[#4262ff]" : "text-[#050038]/60 hover:bg-[#fafafa]"
                      }`}
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-[#4262ff]/10 text-[#4262ff]" : "text-[#050038]/60 hover:bg-[#fafafa]"
                      }`}
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>

              {/* No results */}
              {filteredBoards.length === 0 && (
                <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#050038]/10 bg-white p-12">
                  <Search size={32} className="text-[#050038]/20 mb-4" />
                  <h3 className="text-lg font-semibold text-[#050038]">
                    {boards.length === 0 ? "No boards yet" : "No boards found"}
                  </h3>
                  <p className="mt-2 text-sm text-[#050038]/60">
                    {boards.length === 0
                      ? "Create a board in Miro, then refresh this page."
                      : "Try adjusting your search"}
                  </p>
                </div>
              )}

              {/* Grid View */}
              {viewMode === "grid" && filteredBoards.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredBoards.map((board) => (
                    <div
                      key={board.id}
                      onClick={() => onOpenBoard(board.name)}
                      className="group cursor-pointer rounded-xl bg-white p-4 shadow-[0px_2px_8px_rgba(5,0,56,0.08)] transition-all hover:shadow-[0px_4px_16px_rgba(5,0,56,0.12)]"
                    >
                      {board.picture?.imageURL ? (
                        <img
                          src={board.picture.imageURL}
                          alt={board.name}
                          className="aspect-video w-full rounded-lg mb-4 object-cover bg-[#fafafa]"
                        />
                      ) : (
                        <div
                          className="aspect-video w-full rounded-lg mb-4 flex items-center justify-center text-white font-semibold text-lg"
                          style={{ backgroundColor: boardColor(board.name) }}
                        >
                          {board.name.charAt(0)}
                        </div>
                      )}
                      <h3 className="font-semibold text-[#050038] mb-1 truncate">{board.name}</h3>
                      {board.description && (
                        <p className="text-xs text-[#050038]/40 mb-2 truncate">{board.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-[#050038]/60">
                        <Clock size={14} />
                        <span>{timeAgo(board.modifiedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* List View */}
              {viewMode === "list" && filteredBoards.length > 0 && (
                <div className="rounded-xl bg-white shadow-[0px_2px_8px_rgba(5,0,56,0.08)] overflow-hidden">
                  {filteredBoards.map((board, index) => (
                    <div
                      key={board.id}
                      onClick={() => onOpenBoard(board.name)}
                      className={`flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors ${index < filteredBoards.length - 1 ? 'border-b border-[#050038]/5' : ''
                        }`}
                    >
                      {board.picture?.imageURL ? (
                        <img
                          src={board.picture.imageURL}
                          alt={board.name}
                          className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                          style={{ backgroundColor: boardColor(board.name) }}
                        >
                          {board.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#050038] truncate">{board.name}</h3>
                        {board.description && (
                          <p className="text-xs text-[#050038]/40 truncate">{board.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#050038]/60 flex-shrink-0">
                        <Clock size={14} />
                        <span>{timeAgo(board.modifiedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onNavigateSettings={() => onNavigate('settings')}
        onSignOut={onSignOut}
      />
    </div>
  );
};
