import React from "react";
import { Search, Sparkles, Users, Code, Briefcase, Layout } from "lucide-react";
import { Button } from "../components/ui/Button";

interface TemplatesProps {
  onNavigate: (screen: string) => void;
}

export const Templates: React.FC<TemplatesProps> = ({ onNavigate }) => {
  const categories = [
    { icon: Users, name: "UX Research", count: 12 },
    { icon: Code, name: "Development", count: 18 },
    { icon: Briefcase, name: "Business", count: 24 },
    { icon: Layout, name: "Design", count: 15 },
  ];

  const templates = [
    { id: 1, name: "User Journey Map", category: "UX Research", popular: true, color: "#4262ff" },
    { id: 2, name: "Wireframe Kit", category: "Design", popular: true, color: "#ffd02f" },
    { id: 3, name: "Kanban Board", category: "Business", popular: false, color: "#ef4444" },
    { id: 4, name: "System Architecture", category: "Development", popular: false, color: "#10b981" },
    { id: 5, name: "A/B Testing Plan", category: "UX Research", popular: true, color: "#8b5cf6" },
    { id: 6, name: "Design System", category: "Design", popular: false, color: "#f59e0b" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="flex h-16 items-center justify-between bg-white px-8 shadow-sm border-b border-[#050038]/10">
        <div className="flex items-center gap-8">
          <span className="text-2xl font-bold tracking-tight text-[#050038]">miro</span>
          <nav className="flex gap-8">
            <button onClick={() => onNavigate('boards')} className="text-sm font-semibold text-[#050038]/60 hover:text-[#050038]">Boards</button>
            <button className="text-sm font-semibold text-[#4262ff]">Templates</button>
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
          <div className="mb-8">
            <h1 className="text-[32px] font-bold text-[#050038]">Templates</h1>
            <p className="text-sm text-[#050038]/60 mt-2">Start with pre-built templates for common workflows</p>
          </div>

          {/* Search */}
          <div className="mb-8">
            <div className="relative max-w-2xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#050038]/40" />
              <input
                type="text"
                placeholder="Search templates..."
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-[#050038]/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-[#050038] mb-4">Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <button
                  key={category.name}
                  className="flex items-center gap-3 p-4 rounded-xl bg-white border border-[#050038]/10 hover:border-[#4262ff] hover:shadow-md transition-all"
                >
                  <div className="p-2 rounded-lg bg-[#4262ff]/10 text-[#4262ff]">
                    <category.icon size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#050038] text-sm">{category.name}</p>
                    <p className="text-xs text-[#050038]/60">{category.count} templates</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Templates */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={20} className="text-[#ffd02f]" />
              <h2 className="text-lg font-semibold text-[#050038]">Popular Templates</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group cursor-pointer rounded-xl bg-white p-6 shadow-[0px_2px_8px_rgba(5,0,56,0.08)] transition-all hover:shadow-[0px_4px_16px_rgba(5,0,56,0.12)]"
                >
                  <div 
                    className="aspect-video w-full rounded-lg mb-4 flex items-center justify-center text-white font-semibold text-2xl"
                    style={{ backgroundColor: template.color }}
                  >
                    {template.name.charAt(0)}
                  </div>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[#050038]">{template.name}</h3>
                    {template.popular && (
                      <Sparkles size={16} className="text-[#ffd02f] flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-[#050038]/60 mb-4">{template.category}</p>
                  <Button variant="secondary" className="w-full">Use Template</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
