import React from "react";
import { Settings, RotateCcw, Copy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSettings: () => void;
  onSignOut: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onNavigateSettings, onSignOut }) => {
  const { token, logout } = useAuth();

  if (!isOpen) return null;

  const dashboardLink = token ? `${window.location.origin}/dashboard/${token}` : "";

  const handleCopyLink = () => {
    if (!dashboardLink) return;
    navigator.clipboard.writeText(dashboardLink);
    toast.success("Dashboard link copied");
  };

  const handleStartFresh = () => {
    onClose();
    logout();
    onSignOut();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-20 right-8 z-50 w-80 rounded-xl bg-white shadow-xl border border-[#050038]/10">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-[#4262ff]/10 flex items-center justify-center border-2 border-[#050038]/10">
              <span className="text-2xl font-bold text-[#4262ff]">B</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#050038]">Your workspace</h3>
              <p className="text-sm text-[#050038]/60">No account needed</p>
            </div>
          </div>

          {/* Dashboard link — the private, unguessable URL that IS the credential */}
          <div className="mb-6 p-4 rounded-lg bg-[#fafafa]">
            <p className="text-xs font-semibold text-[#050038]/60 mb-1">YOUR DASHBOARD LINK</p>
            <p className="text-xs text-[#050038]/60 mb-2">
              This link is how you get back to your tests. Bookmark it or share it — anyone with it can see your dashboard.
            </p>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 rounded-md border border-[#050038]/10 bg-white px-3 py-2 text-xs font-medium text-[#050038] hover:bg-[#fafafa]"
            >
              <Copy size={14} />
              Copy link
            </button>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <button
              onClick={() => {
                onClose();
                onNavigateSettings();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-[#050038] hover:bg-[#fafafa] transition-colors"
            >
              <Settings size={18} />
              Settings
            </button>
            <button
              onClick={handleStartFresh}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <RotateCcw size={18} />
              Start a new workspace
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
