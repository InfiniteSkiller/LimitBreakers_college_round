import React from 'react';
import { Shield, Lock, FileText, LayoutDashboard, BarChart3, ShieldCheck, Cpu } from 'lucide-react';

interface NavbarProps {
  activeTab: 'overview' | 'submit' | 'moderator' | 'insights' | 'security';
  setActiveTab: (tab: 'overview' | 'submit' | 'moderator' | 'insights' | 'security') => void;
  isBackendConnected: boolean;
  isModeratorAuthenticated: boolean;
}

interface NavItem {
  id: 'overview' | 'submit' | 'moderator' | 'insights' | 'security';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isBackendConnected,
  isModeratorAuthenticated,
}) => {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'submit', label: 'Submit Report', icon: FileText },
    { id: 'moderator', label: 'Moderator Portal', icon: LayoutDashboard, badge: isModeratorAuthenticated ? 'Auth' : undefined },
    { id: 'insights', label: 'Recipient Insights', icon: BarChart3 },
    { id: 'security', label: 'Security & Architecture', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-teal-400 p-0.5 shadow-lg shadow-violet-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-teal-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider gradient-text font-mono">INCOGNITO</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20">
                  Prototype 1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5">Zero-Knowledge Campus Feedback</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-sm shadow-violet-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* System Status Indicators */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-mono">{isBackendConnected ? 'API Live' : 'Offline'}</span>
            </div>
            
            <button
              onClick={() => setActiveTab('submit')}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-md shadow-violet-600/20 transition-all flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Report Anonymously</span>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex overflow-x-auto px-4 py-2 border-t border-slate-800/60 space-x-2 bg-slate-950/90">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap ${
                isActive ? 'bg-violet-600/30 text-violet-200 border border-violet-500/40' : 'text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
