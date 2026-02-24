import React, { useState, useRef } from "react";
import { User, Bell, Lock, CreditCard, Globe, Save, Upload, CheckCircle2, Link2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { UserProfileModal } from "../components/UserProfileModal";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { getToken } from "../lib/api";

interface SettingsProps {
  onNavigate: (screen: string) => void;
  onSignOut: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate, onSignOut }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Profile state
  const [firstName, setFirstName] = useState("Leo");
  const [lastName, setLastName] = useState("Developer");
  const [email, setEmail] = useState("leo@example.com");
  const [organization, setOrganization] = useState("De La Salle University - Manila");
  const [profileDirty, setProfileDirty] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Notification state
  const [notifications, setNotifications] = useState({
    email: true,
    testCompletion: true,
    weeklySummary: false,
    featureAnnouncements: false,
  });

  // Billing state
  const [currentPlan] = useState("Free");

  // Preferences state
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Manila");
  const [theme, setTheme] = useState("light");
  const [dataRetention, setDataRetention] = useState("90");

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'integrations', label: 'Integrations', icon: Link2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'preferences', label: 'Preferences', icon: Globe },
  ];

  const handleSaveProfile = () => {
    setProfileDirty(false);
    toast.success("Profile updated successfully!");
  };

  const handleChangePhoto = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File too large. Max size is 2MB.");
        return;
      }
      const url = URL.createObjectURL(file);
      setProfilePhoto(url);
      toast.success("Profile photo updated!");
    }
  };

  const handleUpdatePassword = () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated successfully!");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!");
  };

  const handleSavePreferences = () => {
    toast.success("Preferences saved!");
  };

  const handleProfileChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setProfileDirty(true);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-white px-8 shadow-sm border-b border-[#050038]/10">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-bold tracking-tight text-[#050038]">miro</span>
          <nav className="flex gap-8">
            <button onClick={() => onNavigate('boards')} className="cursor-pointer text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Boards</button>
            {/* <button onClick={() => onNavigate('templates')} className="cursor-pointer text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Templates</button> */}
            <button onClick={() => onNavigate('dashboard')} className="cursor-pointer text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Analytics</button>
            <button className="cursor-pointer text-sm font-semibold text-[#4262ff]">Settings</button>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsProfileOpen(true)} className="h-8 w-8 rounded-full bg-[#4262ff]/10 flex items-center justify-center border border-[#050038]/10 cursor-pointer hover:border-[#4262ff] transition-colors">
            <span className="text-sm font-bold text-[#4262ff]">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </button>
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                      ? 'bg-[#4262ff]/10 text-[#4262ff]'
                      : 'text-[#050038]/60 hover:bg-[#fafafa] hover:text-[#050038]'
                      }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </nav>

              <div className="mt-8 pt-8 border-t border-[#050038]/10">
                <button
                  onClick={onSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="rounded-xl bg-white p-8 shadow-[0px_2px_8px_rgba(5,0,56,0.08)]">
                {/* Integrations Tab */}
                {activeTab === 'integrations' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#050038] mb-4">Integrations</h2>
                      <p className="text-sm text-[#050038]/60 mb-6">Manage connected apps and services.</p>
                    </div>

                    <div className="rounded-xl border border-[#050038]/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#ffd02f]/20">
                          <span className="text-xl font-bold text-[#050038] tracking-tighter">miro</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-[#050038] mb-1">Miro</h3>
                          <p className="text-sm text-[#050038]/60">Link boards and run usability tests</p>
                        </div>
                      </div>

                      {user?.hasMiroConnected ? (
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-[#10b981] bg-[#10b981]/10 px-3 py-1.5 rounded-full">
                            <CheckCircle2 size={16} />
                            Connected
                          </span>
                        </div>
                      ) : (
                        <Button variant="primary" onClick={() => {
                          const token = getToken();
                          window.location.href = `/api/miro/authorize?token=${token}`;
                        }}>
                          <Link2 size={16} className="mr-2" />
                          Connect Miro
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#050038] mb-4">Profile Information</h2>
                      <p className="text-sm text-[#050038]/60 mb-6">Update your account profile information and email address.</p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="h-20 w-20 rounded-full bg-[#fafafa] overflow-hidden border-2 border-[#050038]/10">
                        <img src={profilePhoto} alt="Profile" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button variant="secondary" onClick={handleChangePhoto}>
                          <Upload size={16} className="mr-2" />
                          Change Photo
                        </Button>
                        <p className="text-xs text-[#050038]/60 mt-2">JPG, PNG or GIF. Max size 2MB.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#050038] mb-2">First Name</label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={handleProfileChange(setFirstName)}
                          className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#050038] mb-2">Last Name</label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={handleProfileChange(setLastName)}
                          className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={handleProfileChange(setEmail)}
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Organization</label>
                      <input
                        type="text"
                        value={organization}
                        onChange={handleProfileChange(setOrganization)}
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                    </div>

                    <div className="pt-4 border-t border-[#050038]/10">
                      <Button variant="primary" onClick={handleSaveProfile} disabled={!profileDirty}>
                        <Save size={18} className="mr-2" />
                        {profileDirty ? "Save Changes" : "Saved"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Notifications Tab */}
                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#050038] mb-4">Notification Preferences</h2>
                      <p className="text-sm text-[#050038]/60 mb-6">Manage how you receive notifications.</p>
                    </div>

                    <div className="space-y-4">
                      {[
                        { key: 'email' as const, label: 'Email notifications', description: 'Receive email updates about your tests' },
                        { key: 'testCompletion' as const, label: 'Test completion alerts', description: 'Get notified when tests finish collecting data' },
                        { key: 'weeklySummary' as const, label: 'Weekly summary', description: 'Receive weekly analytics summaries' },
                        { key: 'featureAnnouncements' as const, label: 'New feature announcements', description: 'Stay updated on new Beacon features' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-[#050038]/10 last:border-0">
                          <div>
                            <p className="font-medium text-[#050038]">{item.label}</p>
                            <p className="text-sm text-[#050038]/60">{item.description}</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={notifications[item.key]}
                              onChange={(e) => setNotifications(prev => ({ ...prev, [item.key]: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[#050038]/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#4262ff] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4262ff]"></div>
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-[#050038]/10">
                      <Button variant="primary" onClick={handleSaveNotifications}>
                        <Save size={18} className="mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                )}

                {/* Security Tab */}
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
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">New Password</label>
                      <input
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                      {newPassword && newPassword.length < 8 && (
                        <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Confirm Password</label>
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                      />
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-[#050038]/10">
                      <Button variant="primary" onClick={handleUpdatePassword}>
                        Update Password
                      </Button>
                    </div>
                  </div>
                )}

                {/* Billing Tab */}
                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#050038] mb-4">Billing & Subscription</h2>
                      <p className="text-sm text-[#050038]/60 mb-6">Manage your subscription plan and billing information.</p>
                    </div>

                    {/* Current Plan */}
                    <div className="rounded-xl border-2 border-[#4262ff] bg-[#4262ff]/5 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs font-semibold text-[#4262ff] uppercase tracking-wider mb-1">Current Plan</p>
                          <h3 className="text-2xl font-bold text-[#050038]">{currentPlan}</h3>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-full bg-[#4262ff]/10 px-3 py-1 text-xs font-semibold text-[#4262ff]">
                          <CheckCircle2 size={14} />
                          Active
                        </div>
                      </div>
                      <p className="text-sm text-[#050038]/60 mb-4">
                        Includes 3 tests, basic analytics, and 1 team member.
                      </p>
                      <Button variant="primary" onClick={() => toast.info("Upgrade plans coming soon!")}>
                        Upgrade Plan
                      </Button>
                    </div>

                    {/* Available Plans */}
                    <h3 className="text-base font-semibold text-[#050038]">Available Plans</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { name: "Pro", price: "$12/mo", features: ["Unlimited tests", "Advanced analytics", "5 team members"] },
                        { name: "Enterprise", price: "$49/mo", features: ["Everything in Pro", "Priority support", "SSO & security", "Unlimited team"] },
                      ].map((plan) => (
                        <div key={plan.name} className="rounded-xl border border-[#050038]/10 p-6">
                          <h4 className="text-lg font-bold text-[#050038] mb-1">{plan.name}</h4>
                          <p className="text-2xl font-bold text-[#4262ff] mb-4">{plan.price}</p>
                          <ul className="space-y-2 mb-6">
                            {plan.features.map((feature) => (
                              <li key={feature} className="flex items-center gap-2 text-sm text-[#050038]/70">
                                <CheckCircle2 size={14} className="text-[#4262ff] flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                          <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => toast.info(`${plan.name} plan upgrade coming soon!`)}
                          >
                            Select Plan
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Payment Method */}
                    <div>
                      <h3 className="text-base font-semibold text-[#050038] mb-4">Payment Method</h3>
                      <div className="rounded-lg border border-[#050038]/10 p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-14 rounded bg-[#050038]/5 flex items-center justify-center">
                            <CreditCard size={20} className="text-[#050038]/40" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#050038]">No payment method added</p>
                            <p className="text-xs text-[#050038]/60">Add a card to upgrade your plan</p>
                          </div>
                        </div>
                        <Button variant="secondary" onClick={() => toast.info("Payment method setup coming soon!")}>
                          Add Card
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferences Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-[#050038] mb-4">Preferences</h2>
                      <p className="text-sm text-[#050038]/60 mb-6">Customize your Beacon experience.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#4262ff] text-sm"
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                        <option value="ja">日本語</option>
                        <option value="fil">Filipino</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Timezone</label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#4262ff] text-sm"
                      >
                        <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Theme</label>
                      <div className="flex gap-3">
                        {[
                          { value: "light", label: "Light" },
                          { value: "dark", label: "Dark" },
                          { value: "system", label: "System" },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setTheme(option.value);
                              if (option.value !== "light") {
                                toast.info("Dark mode coming soon — saved preference for later!");
                              }
                            }}
                            className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${theme === option.value
                              ? 'border-[#4262ff] bg-[#4262ff]/5 text-[#4262ff]'
                              : 'border-[#050038]/10 text-[#050038]/60 hover:bg-[#fafafa]'
                              }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#050038] mb-2">Data Retention</label>
                      <select
                        value={dataRetention}
                        onChange={(e) => setDataRetention(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-[#050038]/10 bg-white focus:outline-none focus:ring-2 focus:ring-[#4262ff] text-sm"
                      >
                        <option value="30">30 days</option>
                        <option value="90">90 days</option>
                        <option value="180">6 months</option>
                        <option value="365">1 year</option>
                        <option value="forever">Forever</option>
                      </select>
                      <p className="text-xs text-[#050038]/60 mt-1">How long test data is kept before automatic deletion.</p>
                    </div>

                    <div className="pt-4 border-t border-[#050038]/10">
                      <Button variant="primary" onClick={handleSavePreferences}>
                        <Save size={18} className="mr-2" />
                        Save Preferences
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onNavigateSettings={() => setActiveTab('profile')}
        onSignOut={onSignOut}
      />
    </div>
  );
};
