import React from "react";
import { X, User, Settings, LogOut } from "lucide-react";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateSettings: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onNavigateSettings }) => {
  if (!isOpen) return null;

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
            <div className="h-16 w-16 rounded-full bg-[#fafafa] overflow-hidden border-2 border-[#050038]/10">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" 
                alt="Profile" 
                className="h-full w-full object-cover" 
              />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[#050038]">Leo Developer</h3>
              <p className="text-sm text-[#050038]/60">leo@example.com</p>
            </div>
          </div>

          {/* Organization */}
          <div className="mb-6 p-4 rounded-lg bg-[#fafafa]">
            <p className="text-xs font-semibold text-[#050038]/60 mb-1">ORGANIZATION</p>
            <p className="text-sm font-medium text-[#050038]">De La Salle University - Manila</p>
          </div>

          {/* Actions */}
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-[#050038] hover:bg-[#fafafa] transition-colors">
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
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
