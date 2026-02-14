import React, { useState } from "react";
import { User, Bell, Lock, CreditCard, Globe, Save } from "lucide-react";
import { Button } from "../components/ui/Button";

interface SettingsProps {
  onNavigate: (screen: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-white px-8 shadow-sm border-b border-[#050038]/10">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-bold tracking-tight text-[#050038]">miro</span>
          <nav className="flex gap-8">
            <button onClick={() => onNavigate('boards')} className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Boards</button>
            <button onClick={() => onNavigate('templates')} className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Templates</button>
            <button onClick={() => onNavigate('dashboard')} className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Analytics</button>
            <button className="text-sm font-semibold text-[#4262ff]">Settings</button>
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
        <div className="mx-auto max-w-6xl">
          <h1 className="text-[32px] font-bold text-[#050038] mb-8">Settings</h1>

          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#4262ff]/10 text-[#4262ff]'
                        : 'text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]'
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="rounded-xl bg-white p-8 shadow-[0px_2px_8px_rgba(5,0,56,0.08)]">
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#050038] mb-4">Profile Information</h2>
                      <p className="text-sm text-[#050038]/60 mb-6">Update your account profile information and email address.</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 rounded-full bg-[#fafafa] overflow-hidden border-2 border-[#050038]/10">
                        <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop" alt="Profile" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <Button variant="secondary">Change Photo</Button>
                        <p className="text-xs text-[#050038]/60 mt-2">JPG, PNG or GIF. Max size 2MB.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#050038] mb-2">First Name</label>
                        <input
                          type="text"
                          defaultValue="Leo"
                          className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#050038] mb-2">Last Name</label>
                        <input
                          type="text"
                          defaultValue="Developer"
                          className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Email Address</label>
                      <input
                        type="email"
                        defaultValue="leo@example.com"
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Organization</label>
                      <input
                        type="text"
                        defaultValue="De La Salle University - Manila"
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                    </div>

                    <div className="pt-4 border-t border-[#050038]/10">
                      <Button variant="primary">
                        <Save size={18} className="mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#050038] mb-4">Notification Preferences</h2>
                      <p className="text-sm text-[#050038]/60 mb-6">Manage how you receive notifications.</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { label: 'Email notifications', description: 'Receive email updates about your tests' },
                        { label: 'Test completion alerts', description: 'Get notified when tests finish collecting data' },
                        { label: 'Weekly summary', description: 'Receive weekly analytics summaries' },
                        { label: 'New feature announcements', description: 'Stay updated on new Beacon features' },
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-[#050038]/10 last:border-0">
                          <div>
                            <p className="font-medium text-[#050038]">{item.label}</p>
                            <p className="text-sm text-[#050038]/60">{item.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" defaultChecked={index < 2} className="sr-only peer" />
                            <div className="w-11 h-6 bg-[#050038]/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#4262ff] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4262ff]"></div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#050038] mb-4">Security Settings</h2>
                      <p className="text-sm text-[#050038]/60 mb-6">Manage your password and security preferences.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Current Password</label>
                      <input
                        type="password"
                        placeholder="Enter current password"
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">New Password</label>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Confirm Password</label>
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                    </div>

                    <div className="pt-4 border-t border-[#050038]/10">
                      <Button variant="primary">
                        Update Password
                      </Button>
                    </div>
                  </div>
                )}

                {(activeTab === 'billing' || activeTab === 'preferences') && (
                  <div className="text-center py-12">
                    <p className="text-[#050038]/60">Coming soon...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
