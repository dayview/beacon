import React, { useState } from "react";
import { Plus, GitCompare, User, Play, Pause, Square, MoreHorizontal, ArrowRight, Clock, Users, Calendar, Trash2, Link } from "lucide-react";
import { useTests, Test } from "../contexts/TestContext";
import { EditTestModal } from "../components/EditTestModal";
import { DeleteConfirmModal } from "../components/DeleteConfirmModal";
import { UserProfileModal } from "../components/UserProfileModal";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";

interface DashboardProps {
  onNavigate: (screen: string) => void;
  onOpenNewTest: () => void;
  onSignOut: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onOpenNewTest, onSignOut }) => {
  const { user } = useAuth();
  const { tests, selectTest, updateTest, deleteTest, changeTestStatus } = useTests();
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [deletingTest, setDeletingTest] = useState<Test | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const handleViewResults = (test: Test) => {
    selectTest(test.id);
    onNavigate("analytics");
  };

  const handleStopTest = (test: Test) => {
    changeTestStatus(test.id, 'completed');
  };

  const handlePauseTest = (test: Test) => {
    changeTestStatus(test.id, 'paused');
  };

  const handleResumeTest = (test: Test) => {
    changeTestStatus(test.id, 'live');
  };

  const handleCopyLink = (testId: string) => {
    const link = `${window.location.origin}/participate?testId=${testId}`;
    navigator.clipboard.writeText(link);
    toast.success('Participant link copied to clipboard!');
    toast.info('This link is for participant testing, but you can use it to run a solo test yourself.', { duration: 6000 });
  };

  const getStatusBadge = (status: Test['status']) => {
    const configs = {
      live: {
        bg: 'bg-[#4262ff]',
        text: 'text-white',
        label: 'Live',
        icon: <span className="mr-1.5 h-2 w-2 rounded-full bg-white"></span>
      },
      paused: {
        bg: 'bg-[#ffd02f]',
        text: 'text-[#050038]',
        label: 'Paused',
        icon: <Pause size={10} className="mr-1 fill-current" />
      },
      collecting: {
        bg: 'bg-[#4262ff]/10',
        text: 'text-[#4262ff]',
        label: 'Collecting',
        icon: <Clock size={12} className="mr-1" />
      },
      completed: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        label: 'Completed',
        icon: <Square size={10} className="mr-1 fill-current" />
      },
      draft: {
        bg: 'bg-[#050038]/10',
        text: 'text-[#050038]/60',
        label: 'Draft',
        icon: null
      }
    };

    const config = configs[status];
    return (
      <span className={`inline-flex items-center rounded-full ${config.bg} px-3 py-1 text-xs font-semibold ${config.text}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafa]">
      {/* Top Navigation Bar */}
      <header className="flex h-16 items-center justify-between bg-white px-8 shadow-sm">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold tracking-tight text-[#050038]">Beacon</span>
          </div>
          <nav className="flex gap-8">
            <button onClick={() => onNavigate('boards')} className="cursor-pointer text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Boards</button>
            {/* <button onClick={() => onNavigate('templates')} className="cursor-pointer text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Templates</button> */}
            <button className="cursor-pointer text-sm font-semibold text-[#4262ff]">Analytics</button>
            <button onClick={() => onNavigate('settings')} className="cursor-pointer text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Settings</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="h-8 w-8 rounded-full bg-[#4262ff]/10 flex items-center justify-center border border-[#050038]/10 cursor-pointer hover:border-[#4262ff] transition-colors"
          >
            <span className="text-sm font-bold text-[#4262ff]">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div>
            <h1 className="text-[32px] font-bold leading-[40px] text-[#050038]">Analytics</h1>
            <p className="mt-2 text-sm text-[#050038]/60">Track prototype testing and user behavior insights</p>
          </div>

          {/* Tab Navigation */}
          <div className="mt-6 border-b border-[#050038]/10">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('active')}
                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'active' ? 'border-b-2 border-[#4262ff] text-[#050038]' : 'text-[#050038]/60 hover:text-[#050038]'}`}
              >
                My Tests ({tests.filter(t => t.status !== 'completed').length})
              </button>
              <button
                onClick={() => setActiveTab('archived')}
                className={`pb-3 text-sm font-semibold transition-colors ${activeTab === 'archived' ? 'border-b-2 border-[#4262ff] text-[#050038]' : 'text-[#050038]/60 hover:text-[#050038]'}`}
              >
                Archived ({tests.filter(t => t.status === 'completed').length})
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
          {(() => {
            const filteredTests = activeTab === 'active'
              ? tests.filter(t => t.status !== 'completed')
              : tests.filter(t => t.status === 'completed');

            return filteredTests.length === 0 ? (
              <div className="mt-8 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#050038]/10 bg-white p-12">
                <div className="rounded-full bg-[#fafafa] p-4">
                  <Plus className="h-8 w-8 text-[#050038]/40" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#050038]">
                  {activeTab === 'active' ? 'No tests yet' : 'No archived tests'}
                </h3>
                <p className="mt-2 text-center text-sm text-[#050038]/60">
                  {activeTab === 'active'
                    ? 'Get started by creating your first usability test'
                    : 'Completed tests will appear here'}
                </p>
                {activeTab === 'active' && (
                  <button
                    onClick={onOpenNewTest}
                    className="mt-6 inline-flex items-center justify-center rounded-md bg-[#ffd02f] px-6 py-2 text-sm font-semibold text-[#050038] hover:bg-[#ffd02f]/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Test
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTests.map((test) => (
                  <div key={test.id} className="group relative flex flex-col overflow-hidden rounded-xl bg-white p-6 shadow-[0px_2px_8px_rgba(5,0,56,0.08)] transition-shadow hover:shadow-[0px_4px_16px_rgba(5,0,56,0.12)]">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[#fafafa]">
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,#fafafa_25%,transparent_25%,transparent_75%,#fafafa_75%,#fafafa),linear-gradient(45deg,#fafafa_25%,transparent_25%,transparent_75%,#fafafa_75%,#fafafa)] bg-[length:20px_20px] opacity-50"></div>
                      <div className="absolute inset-4 flex items-center justify-center rounded border border-dashed border-[#050038]/20">
                        <span className="text-[#050038]/40 text-xs text-center px-2">{test.name} Preview</span>
                      </div>
                      <div className="absolute top-2 right-2">
                        {getStatusBadge(test.status)}
                      </div>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-[#050038]">{test.name}</h3>

                    <div className="mt-2 flex items-center gap-4 text-sm text-[#050038]/60">
                      <div className="flex items-center gap-1.5">
                        <User size={14} />
                        <span>{test.type === 'solo' ? 'Solo Test' : 'Live Session'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} />
                        <span>{test.participants.current}/{test.participants.target}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-[#050038]/60">
                      <Calendar size={14} />
                      <span>Started {formatDate(test.createdAt)}</span>
                    </div>

                    <div className="mt-6 flex items-center gap-2">
                      <button
                        onClick={() => handleViewResults(test)}
                        className="flex-1 rounded-md bg-[#ffd02f] px-3 py-2 text-sm font-semibold text-[#050038] transition-colors hover:bg-[#ffd02f]/90"
                      >
                        View Results
                      </button>
                      <button
                        onClick={() => setEditingTest(test)}
                        className="rounded-md border border-[#050038]/10 bg-white px-3 py-2 text-sm font-semibold text-[#050038]/60 transition-colors hover:bg-[#fafafa] hover:text-[#050038]"
                      >
                        Edit
                      </button>
                      {test.status === 'live' || test.status === 'collecting' ? (
                        <button
                          onClick={() => handleStopTest(test)}
                          className="rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                          title="Stop test"
                        >
                          <Square size={16} />
                        </button>
                      ) : test.status === 'paused' ? (
                        <button
                          onClick={() => handleResumeTest(test)}
                          className="rounded-md px-3 py-2 text-sm font-semibold text-green-600 transition-colors hover:bg-green-50"
                          title="Resume test"
                        >
                          <Play size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeletingTest(test)}
                          className="rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                          title="Delete test"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {(test.status === 'live' || test.status === 'paused' || test.status === 'collecting') && (
                        <button
                          onClick={() => handleCopyLink(test.id)}
                          className="rounded-md px-3 py-2 text-sm font-semibold text-[#4262ff] transition-colors hover:bg-[#4262ff]/10"
                          title="Copy participant link"
                        >
                          <Link size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </main>

      {/* Modals */}
      {editingTest && (
        <EditTestModal
          isOpen={true}
          onClose={() => setEditingTest(null)}
          onSave={(updates) => {
            updateTest(editingTest.id, updates);
            setEditingTest(null);
          }}
          test={editingTest}
        />
      )}

      {deletingTest && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setDeletingTest(null)}
          onConfirm={() => {
            deleteTest(deletingTest.id);
            setDeletingTest(null);
          }}
          testName={deletingTest.name}
        />
      )}

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onNavigateSettings={() => onNavigate('settings')}
        onSignOut={onSignOut}
      />
    </div>
  );
};
