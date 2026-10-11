import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  BarChart3,
  Bell,
  CalendarCheck,
  ChevronDown,
  Clock3,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Library,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Upload,
  User,
  type LucideIcon
} from 'lucide-react';
import { RecentActivityItem, UserProfile } from '../types/index.ts';
import { NavTab } from './Sidebar.tsx';

interface HeaderProps {
  title: string;
  subtitle?: string;
  user: UserProfile | null;
  recentActivity: RecentActivityItem[];
  hasGeminiKey: boolean;
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  onSignOut: () => Promise<void>;
  onOpenMobileMenu: () => void;
  onOpenUpload: () => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export function Header({
  title,
  subtitle,
  user,
  recentActivity = [],
  hasGeminiKey,
  activeTab,
  onNavigate,
  onSignOut,
  onOpenMobileMenu,
  onOpenUpload,
  onResetDemo,
  isResetting
}: HeaderProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAccountMenuOpen && !isNotificationsOpen && !isHelpOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!accountMenuRef.current?.contains(event.target)) {
        setIsAccountMenuOpen(false);
      }
      if (!notificationsRef.current?.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
      if (!helpRef.current?.contains(event.target)) {
        setIsHelpOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
        setIsNotificationsOpen(false);
        setIsHelpOpen(false);
      }
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isAccountMenuOpen, isNotificationsOpen, isHelpOpen]);

  const openHelpDestination = (destination: NavTab) => {
    setIsHelpOpen(false);
    onNavigate(destination);
  };

  const mainTabs: { id: NavTab; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: 'Subjects', icon: BookOpen },
    { id: 'tutor', label: 'AI Tutor', icon: GraduationCap },
    { id: 'quizzes', label: 'Quiz', icon: Sparkles }
  ];
  const moreTabs: { id: NavTab; label: string; icon: LucideIcon }[] = [
    { id: 'materials', label: 'Study Materials', icon: BookOpen },
    { id: 'library', label: 'My Library', icon: Library },
    { id: 'analytics', label: 'Learning Analytics', icon: BarChart3 },
    { id: 'planner', label: 'Study Planner', icon: CalendarCheck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#E8E5F0] bg-white/95 px-4 py-3 shadow-sm backdrop-blur-md md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="-ml-2 rounded-lg p-2 text-[#77758A] hover:bg-[#EEE9FF] hover:text-[#6D4AFF] lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEE9FF] text-[#6D4AFF]">
            <BookOpen className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight text-[#242338] sm:text-base">LearnMate AI</h1>
            <p className="hidden text-[10px] font-medium text-[#77758A] sm:block">Learn Smarter, Not Harder</p>
            <span className="sr-only">{title}{subtitle ? `: ${subtitle}` : ''}</span>
          </div>
        </div>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 rounded-2xl bg-[#F7F5FF] p-1 lg:flex">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setIsMoreOpen(false); onNavigate(tab.id); }}
                aria-current={selected ? 'page' : undefined}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                  selected ? 'bg-white text-[#6D4AFF] shadow-sm' : 'text-[#77758A] hover:text-[#6D4AFF]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />{tab.label}
              </button>
            );
          })}
          <div className="relative">
            <button
              onClick={() => setIsMoreOpen((open) => !open)}
              aria-expanded={isMoreOpen}
              className={`flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                moreTabs.some((tab) => tab.id === activeTab) ? 'bg-white text-[#6D4AFF] shadow-sm' : 'text-[#77758A] hover:text-[#6D4AFF]'
              }`}
            >
              More <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {isMoreOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-[#E8E5F0] bg-white p-1.5 shadow-lg">
                {moreTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { onNavigate(tab.id); setIsMoreOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium ${
                        activeTab === tab.id ? 'bg-[#EEE9FF] text-[#6D4AFF]' : 'text-[#4C4A5D] hover:bg-[#F7F5FF]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />{tab.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`hidden items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium lg:flex ${
              hasGeminiKey
                ? 'bg-[#DDF7E8] border-[#1B6A43]/30 text-[#1B6A43]'
                : 'bg-[#F7F5FF] border-[#E8E5F0] text-[#77758A]'
            }`}
            title={hasGeminiKey ? 'GEMINI_API_KEY is present on the server; a live request is needed to verify access and quota' : 'The AI tutor is unavailable until GEMINI_API_KEY is configured on the server'}
          >
            {hasGeminiKey ? (
              <>
                <Sparkles className="w-3 h-3 text-[#1B6A43]" />
                <span>Gemini Configured</span>
              </>
            ) : (
              <>
                <KeyRound className="w-3 h-3 text-[#77758A]" />
                <span>Gemini Not Configured</span>
              </>
            )}
          </div>

          <button
            onClick={onOpenUpload}
            className="hidden items-center gap-1.5 rounded-xl bg-[#6D4AFF] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5638D5] sm:flex"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload</span>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            title="Open settings"
            aria-label="Open settings"
            className="hidden rounded-lg p-2 text-[#77758A] hover:bg-[#EEE9FF] hover:text-[#6D4AFF] sm:block"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            title="Reset demo data"
            aria-label="Reset demo data"
            className="hidden rounded-lg p-2 text-[#77758A] hover:bg-[#EEE9FF] hover:text-[#6D4AFF] md:block"
          >
            <RefreshCw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotificationsOpen((open) => !open);
                setIsAccountMenuOpen(false);
              }}
              aria-label={`Notifications${recentActivity.length ? `, ${recentActivity.length} recent updates` : ''}`}
              aria-haspopup="dialog"
              aria-expanded={isNotificationsOpen}
              className="relative rounded-lg p-2 text-[#77758A] hover:bg-[#EEE9FF] hover:text-[#6D4AFF] focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]"
            >
              <Bell className="h-4 w-4" />
              {recentActivity.length > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-white bg-[#E5484D]" />
              )}
            </button>
            {isNotificationsOpen && (
              <section
                role="dialog"
                aria-label="Notifications"
                className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E8E5F0] bg-white shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-[#E8E5F0] px-4 py-3">
                  <h2 className="text-sm font-bold text-[#242338]">Notifications</h2>
                  {recentActivity.length > 0 && (
                    <span className="rounded-full bg-[#EEE9FF] px-2 py-0.5 text-[10px] font-semibold text-[#6D4AFF]">
                      {recentActivity.length} updates
                    </span>
                  )}
                </div>
                {recentActivity.length > 0 ? (
                  <>
                    <ul className="max-h-80 divide-y divide-[#F0EEF5] overflow-y-auto">
                      {recentActivity.map((activity) => {
                        const date = new Date(activity.timestamp);
                        const formattedDate = Number.isNaN(date.getTime())
                          ? activity.timestamp
                          : date.toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            });
                        return (
                          <li key={activity.id} className="flex gap-3 px-4 py-3">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EEE9FF] text-[#6D4AFF]">
                              <Clock3 className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-relaxed text-[#4C4A5D]">{activity.title}</p>
                              <time dateTime={activity.timestamp} className="mt-1 block text-[10px] text-[#77758A]">
                                {formattedDate}
                              </time>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationsOpen(false);
                        onNavigate('analytics');
                      }}
                      className="w-full border-t border-[#E8E5F0] px-4 py-2.5 text-xs font-semibold text-[#6D4AFF] hover:bg-[#F7F5FF]"
                    >
                      View learning analytics
                    </button>
                  </>
                ) : (
                  <p className="px-4 py-6 text-center text-xs text-[#77758A]">
                    You’re all caught up. New study updates will appear here.
                  </p>
                )}
              </section>
            )}
          </div>

          <div className="relative" ref={helpRef}>
            <button
              type="button"
              onClick={() => {
                setIsHelpOpen((open) => !open);
                setIsNotificationsOpen(false);
                setIsAccountMenuOpen(false);
              }}
              aria-label="Help and support"
              aria-haspopup="dialog"
              aria-expanded={isHelpOpen}
              title="Help and support"
              className="rounded-lg p-2 text-[#77758A] hover:bg-[#EEE9FF] hover:text-[#6D4AFF] focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            {isHelpOpen && (
              <section
                role="dialog"
                aria-label="Help and support"
                className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#E8E5F0] bg-white shadow-xl"
              >
                <div className="border-b border-[#E8E5F0] bg-[#F7F5FF] px-4 py-3">
                  <h2 className="text-sm font-bold text-[#242338]">How can we help?</h2>
                  <p className="mt-1 text-xs text-[#77758A]">Quick guides to the main LearnMate tools.</p>
                </div>
                <div className="space-y-1 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsHelpOpen(false);
                      onOpenUpload();
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#F7F5FF]"
                  >
                    <span className="block text-xs font-semibold text-[#4C4A5D]">Upload study materials</span>
                    <span className="mt-0.5 block text-[11px] text-[#77758A]">Add a PDF, text, or Markdown file to your library.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openHelpDestination('tutor')}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#F7F5FF]"
                  >
                    <span className="block text-xs font-semibold text-[#4C4A5D]">Get help studying</span>
                    <span className="mt-0.5 block text-[11px] text-[#77758A]">Ask the AI Tutor questions about your materials.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openHelpDestination('quizzes')}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#F7F5FF]"
                  >
                    <span className="block text-xs font-semibold text-[#4C4A5D]">Practice with a quiz</span>
                    <span className="mt-0.5 block text-[11px] text-[#77758A]">Create practice questions and review explanations.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openHelpDestination('planner')}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#F7F5FF]"
                  >
                    <span className="block text-xs font-semibold text-[#4C4A5D]">Plan your study time</span>
                    <span className="mt-0.5 block text-[11px] text-[#77758A]">View and manage tasks in your Study Planner.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openHelpDestination('settings')}
                    className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#F7F5FF]"
                  >
                    <span className="block text-xs font-semibold text-[#4C4A5D]">Profile and app settings</span>
                    <span className="mt-0.5 block text-[11px] text-[#77758A]">Update your learning goals and preferences.</span>
                  </button>
                </div>
              </section>
            )}
          </div>

          <div className="relative" ref={accountMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsAccountMenuOpen((open) => !open);
                setIsNotificationsOpen(false);
              }}
              aria-label="Open account menu"
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              title={user?.name || 'Learner'}
              className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#DCD4FF] bg-[#EEE9FF] text-xs font-semibold text-[#6D4AFF] hover:ring-2 hover:ring-[#DCD4FF] focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : user?.name ? (
                user.name.charAt(0).toUpperCase()
              ) : (
                <User className="h-4 w-4" />
              )}
            </button>
            {isAccountMenuOpen && (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-[#E8E5F0] bg-white shadow-xl"
              >
                <div className="border-b border-[#E8E5F0] bg-[#F7F5FF] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#77758A]">My account profile</p>
                  <p className="mt-1 truncate text-sm font-bold text-[#242338]">{user?.name || 'Learner'}</p>
                  {user?.email && <p className="truncate text-xs text-[#77758A]">{user.email}</p>}
                </div>
                <div className="p-1.5">
                  <a
                    href="/login"
                    role="menuitem"
                    onClick={() => setIsAccountMenuOpen(false)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[#4C4A5D] hover:bg-[#F7F5FF] hover:text-[#6D4AFF]"
                  >
                    <Plus className="h-4 w-4" />
                    Add another account
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      onNavigate('settings');
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[#4C4A5D] hover:bg-[#F7F5FF] hover:text-[#6D4AFF]"
                  >
                    <Settings className="h-4 w-4" />
                    Manage your account
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      void onSignOut();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-[#B42318] hover:bg-[#FEF3F2]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <nav aria-label="Primary sections" className="mx-auto mt-3 flex w-full max-w-7xl justify-start gap-2 overflow-x-auto px-4 lg:hidden">
        {mainTabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onNavigate(tab.id)} aria-current={selected ? 'page' : undefined} className={`flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs font-semibold ${selected ? 'bg-[#EEE9FF] text-[#6D4AFF]' : 'text-[#77758A] hover:bg-[#F7F5FF]'}`}>
              <Icon className="h-4 w-4" />{tab.label}
            </button>
          );
        })}
        <button onClick={() => { onOpenMobileMenu(); setIsMoreOpen(false); }} className="flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-3 text-xs font-semibold text-[#77758A] hover:bg-[#F7F5FF]">
          More <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </nav>
    </header>
  );
}
