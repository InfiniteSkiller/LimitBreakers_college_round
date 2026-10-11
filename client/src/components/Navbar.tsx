import React from 'react';
import { Shield, Lock, FileText, LayoutDashboard, BarChart3, Cpu, ArrowUpRight, type LucideIcon } from 'lucide-react';

type TabId = 'overview' | 'submit' | 'moderator' | 'insights' | 'security';

interface NavbarProps {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isBackendConnected: boolean;
  isModeratorAuthenticated: boolean;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Shield },
  { id: 'submit', label: 'Submit', icon: FileText },
  { id: 'moderator', label: 'Moderate', icon: LayoutDashboard },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
  { id: 'security', label: 'Security', icon: Cpu },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, isBackendConnected }) => {
  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-ink bg-paper">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className="group flex items-center gap-3 text-left"
            aria-label="Incognito home"
          >
            <span className="flex h-11 w-11 items-center justify-center border-[3px] border-ink bg-signal shadow-hard-sm transition-transform group-hover:-rotate-6">
              <Shield className="h-6 w-6 text-ink" strokeWidth={2.75} />
            </span>
            <span className="flex flex-col">
              <span className="font-display text-4xl leading-none tracking-wide">INCOGNITO</span>
              <span className="brut-label !mb-0 !text-[0.6rem] text-steel">Campus feedback / Proto 1</span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 lg:flex" aria-label="Main">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2 border-[3px] px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-[transform,box-shadow,background-color] duration-100 ${
                    isActive
                      ? 'border-ink bg-signal shadow-hard-sm'
                      : 'border-transparent hover:border-ink hover:bg-ink hover:text-paper'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Status + CTA */}
          <div className="flex items-center gap-3">
            <div
              className={`brut-tag ${isBackendConnected ? 'brut-tag-go' : 'brut-tag-alarm'}`}
              role="status"
              aria-live="polite"
            >
              <span className={`h-2 w-2 bg-ink ${isBackendConnected ? 'animate-pulse' : ''}`} />
              <span>{isBackendConnected ? 'API live' : 'Offline'}</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className="brut-btn brut-btn-ink hidden xl:inline-flex"
            >
              <Lock className="h-4 w-4" strokeWidth={2.75} />
              <span>Report anonymously</span>
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.75} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / tablet nav */}
      <nav className="flex gap-2 overflow-x-auto border-t-[3px] border-ink bg-card px-4 py-2 lg:hidden" aria-label="Main (compact)">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-shrink-0 items-center gap-1.5 border-2 border-ink px-3 py-1.5 font-mono text-[0.7rem] font-bold uppercase tracking-wider ${
                isActive ? 'bg-signal shadow-hard-sm' : 'bg-paper'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
