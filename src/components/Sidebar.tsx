import React from 'react';
import {
  LayoutDashboard,
  Library,
  GraduationCap,
  Sparkles,
  BarChart3,
  CalendarCheck,
  Settings,
  Upload,
  BookOpen
} from 'lucide-react';

export type NavTab = 'overview' | 'materials' | 'library' | 'tutor' | 'quizzes' | 'analytics' | 'planner' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenUpload: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  documentsCount?: number;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  onOpenUpload,
  isOpenMobile,
  onCloseMobile,
  documentsCount = 0
}: SidebarProps) {
  const navItems: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'materials', label: 'Study Materials', icon: GraduationCap },
    { id: 'library', label: 'My Library', icon: Library, badge: documentsCount > 0 ? documentsCount : undefined },
    { id: 'tutor', label: 'AI Tutor', icon: GraduationCap },
    { id: 'quizzes', label: 'Practice & Quizzes', icon: Sparkles },
    { id: 'analytics', label: 'Learning Analytics', icon: BarChart3 },
    { id: 'planner', label: 'Study Planner', icon: CalendarCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#EEE9FF] border-r border-[#E8E5F0] flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#E8E5F0] bg-[#EEE9FF]/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6D4AFF] text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 text-[#EEE9FF]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-xl font-bold tracking-tight text-[#6D4AFF]">LearnMate</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#6D4AFF]/10 text-[#6D4AFF]">AI</span>
              </div>
              <p className="text-[11px] text-[#77758A] font-medium">Source-Grounded Study Companion</p>
            </div>
          </div>
        </div>

        {/* Upload Action Button */}
        <div className="p-4 border-b border-[#E8E5F0]">
          <button
            onClick={() => {
              onOpenUpload();
              if (isOpenMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#6D4AFF] hover:bg-[#5638D5] text-white rounded-xl font-semibold text-sm shadow-xs hover:shadow transition-all duration-150 cursor-pointer group"
          >
            <Upload className="w-4 h-4 text-[#EEE9FF] group-hover:-translate-y-0.5 transition-transform" />
            <span>Upload Material</span>
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#77758A]">
            Study Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (isOpenMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#6D4AFF] text-white shadow-xs'
                    : 'text-[#242338] hover:text-[#5638D5] hover:bg-[#EEE9FF]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#EEE9FF]' : 'text-[#77758A]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-[#5638D5] text-[#EEE9FF]'
                        : 'bg-[#EEE9FF] text-[#242338]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Status */}
        <div className="p-4 border-t border-[#E8E5F0] bg-[#EEE9FF]/40">
          <div className="p-3 rounded-xl bg-white border border-[#E8E5F0] text-xs shadow-2xs">
            <div className="flex items-center justify-between font-medium text-[#242338]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#1B6A43] animate-pulse" />
                Adaptive Engine
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#EEE9FF] text-[#6D4AFF]">Active</span>
            </div>
            <p className="text-[11px] text-[#77758A] mt-1">Grounded RAG retrieval & verified page citations.</p>
          </div>
        </div>
      </aside>
    </>
  );
}
