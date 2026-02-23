import React, { useState, useEffect, useCallback } from "react";
import { Search, Sparkles, Users, Code, Briefcase, Layout, X, Loader2, ExternalLink } from "lucide-react";
import { Button } from "../components/ui/Button";
import { UserProfileModal } from "../components/UserProfileModal";
import { toast } from "sonner";
import { api, ApiTemplate, ApiTemplateCategory } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

interface TemplatesProps {
  onNavigate: (screen: string) => void;
  onSignOut: () => void;
}

/** Map category name to a Lucide icon component */
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "UX Research": Users,
  Development: Code,
  Business: Briefcase,
  Design: Layout,
};

export const Templates: React.FC<TemplatesProps> = ({ onNavigate, onSignOut }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Data from API
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [categories, setCategories] = useState<ApiTemplateCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ templates: ApiTemplate[]; categories: ApiTemplateCategory[] }>("/api/templates");
      setTemplates(data.templates);
      setCategories(data.categories);
    } catch {
      toast.error("Failed to load templates.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !activeCategory || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = async (template: ApiTemplate) => {
    setUsingTemplateId(template._id);
    try {
      const data = await api.post<{
        success: boolean;
        board: { id: string; name: string; viewLink?: string } | null;
        message: string;
      }>(`/api/templates/${template._id}/use`);

      if (data.board?.viewLink) {
        toast.success(
          <div className="flex items-center gap-2">
            <span>Board "{data.board.name}" created!</span>
            <a
              href={data.board.viewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[#4262ff] underline"
            >
              Open <ExternalLink size={12} />
            </a>
          </div>
        );
      } else {
        toast.success(data.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to use template";
      toast.error(message);
    } finally {
      setUsingTemplateId(null);
    }
  };

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
          <button onClick={() => setIsProfileOpen(true)} className="h-8 w-8 rounded-full bg-[#fafafa] overflow-hidden border border-[#050038]/10 cursor-pointer hover:border-[#4262ff] transition-colors">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" alt="User" className="h-full w-full object-cover" />
          </button>
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

          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-24">
              <Loader2 size={32} className="animate-spin text-[#4262ff] mb-4" />
              <p className="text-sm text-[#050038]/60">Loading templates...</p>
            </div>
          )}

          {/* Content (loaded) */}
          {!isLoading && (
            <>
              {/* Search */}
              <div className="mb-8">
                <div className="relative max-w-2xl">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#050038]/40" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-10 py-3 rounded-xl border border-[#050038]/10 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4262ff]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#050038]/40 hover:text-[#050038]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold text-[#050038] mb-4">Categories</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {categories.map((category) => {
                      const IconComponent = CATEGORY_ICONS[category.name] || Layout;
                      return (
                        <button
                          key={category.name}
                          onClick={() => setActiveCategory(
                            activeCategory === category.name ? null : category.name
                          )}
                          className={`flex items-center gap-3 p-4 rounded-xl bg-white border transition-all ${activeCategory === category.name
                            ? 'border-[#4262ff] shadow-md bg-[#4262ff]/5'
                            : 'border-[#050038]/10 hover:border-[#4262ff] hover:shadow-md'
                            }`}
                        >
                          <div className={`p-2 rounded-lg ${activeCategory === category.name
                            ? 'bg-[#4262ff] text-white'
                            : 'bg-[#4262ff]/10 text-[#4262ff]'
                            }`}>
                            <IconComponent size={20} />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-[#050038] text-sm">{category.name}</p>
                            <p className="text-xs text-[#050038]/60">{category.count} templates</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Active filter indicator */}
              {activeCategory && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-[#050038]/60">Filtering by:</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#4262ff]/10 px-3 py-1 text-sm font-medium text-[#4262ff]">
                    {activeCategory}
                    <button onClick={() => setActiveCategory(null)} className="hover:text-[#4262ff]/80">
                      <X size={14} />
                    </button>
                  </span>
                </div>
              )}

              {/* Templates */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={20} className="text-[#ffd02f]" />
                  <h2 className="text-lg font-semibold text-[#050038]">
                    {activeCategory ? `${activeCategory} Templates` : "Popular Templates"}
                  </h2>
                </div>

                {filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#050038]/10 bg-white p-12">
                    <Search size={32} className="text-[#050038]/20 mb-4" />
                    <h3 className="text-lg font-semibold text-[#050038]">No templates found</h3>
                    <p className="mt-2 text-sm text-[#050038]/60">Try adjusting your search or category filter</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template._id}
                        className="group cursor-pointer rounded-xl bg-white p-6 shadow-[0px_2px_8px_rgba(5,0,56,0.08)] transition-all hover:shadow-[0px_4px_16px_rgba(5,0,56,0.12)]"
                      >
                        {template.thumbnailUrl ? (
                          <img
                            src={template.thumbnailUrl}
                            alt={template.name}
                            className="aspect-video w-full rounded-lg mb-4 object-cover bg-[#fafafa]"
                          />
                        ) : (
                          <div
                            className="aspect-video w-full rounded-lg mb-4 flex items-center justify-center text-white font-semibold text-2xl"
                            style={{ backgroundColor: template.color }}
                          >
                            {template.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex items-start justify-between mb-1">
                          <h3 className="font-semibold text-[#050038]">{template.name}</h3>
                          {template.popular && (
                            <Sparkles size={16} className="text-[#ffd02f] flex-shrink-0" />
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-[#050038]/50 mb-2 line-clamp-2">{template.description}</p>
                        )}
                        <p className="text-sm text-[#050038]/60 mb-4">{template.category}</p>
                        <Button
                          variant="secondary"
                          className="w-full"
                          disabled={usingTemplateId === template._id}
                          onClick={() => handleUseTemplate(template)}
                        >
                          {usingTemplateId === template._id ? (
                            <>
                              <Loader2 size={14} className="mr-2 animate-spin" />
                              Applying...
                            </>
                          ) : (
                            "Use Template"
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
