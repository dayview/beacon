import React from "react";
import { X, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSettings: () => void;
  onSignOut: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onNavigateSettings, onSignOut }) => {
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  const handleSignOut = () => {
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
          {/* Profile Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-[#4262ff]/10 flex items-center justify-center border-2 border-[#050038]/10">
              <span className="text-2xl font-bold text-[#4262ff]">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#050038]">{user?.name || 'User'}</h3>
              <p className="text-sm text-[#050038]/60">{user?.email || 'No email'}</p>
            </div>
          </div>

          {/* Plan & Role Info */}
          <div className="mb-6 p-4 rounded-lg bg-[#fafafa]">
            <p className="text-xs font-semibold text-[#050038]/60 mb-1">ACCOUNT</p>
            <p className="text-sm font-medium text-[#050038] capitalize">{user?.plan?.tier || 'Free'} Plan</p>
            <p className="text-xs text-[#050038]/40 mt-1">{user?.role || 'researcher'}</p>
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
              <User size={18} />
              View Profile
            </button>
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
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
