import React from 'react';
import { Shield, Lock, FileText, LayoutDashboard, BarChart3, Cpu, GraduationCap, KeyRound, LogOut, UserCheck } from 'lucide-react';

export type UserRole = 'student' | 'admin' | null;

interface NavbarProps {
  activeTab: 'overview' | 'submit' | 'moderator' | 'insights' | 'security';
  setActiveTab: (tab: 'overview' | 'submit' | 'moderator' | 'insights' | 'security') => void;
  isBackendConnected: boolean;
  userRole: UserRole;
  studentTicket: string | null;
  onOpenLogin: (role?: 'student' | 'admin') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isBackendConnected,
  userRole,
  studentTicket,
  onOpenLogin,
  onLogout,
}) => {
  // Dynamic navigation items based on current role
  const navItems = [
    { id: 'overview' as const, label: 'Overview', icon: Shield },
    ...(userRole === 'admin'
      ? [{ id: 'moderator' as const, label: 'Moderator Queue', icon: LayoutDashboard, badge: 'Staff' }]
      : [{ id: 'submit' as const, label: 'Submit Report', icon: FileText }]),
    { id: 'insights' as const, label: 'Campus Insights', icon: BarChart3 },
    { id: 'security' as const, label: 'Security & ZK', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
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
                  v1.0
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
                  {'badge' in item && item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Role Actions & Status */}
          <div className="flex items-center space-x-3">
            {/* API Health Pill */}
            <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px]">
              <span className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-mono">{isBackendConnected ? 'API Live' : 'Offline'}</span>
            </div>

            {/* Authenticated State Display */}
            {userRole === 'student' && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-violet-950/60 border border-violet-500/40 text-xs">
                  <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-violet-200 font-mono font-medium">{studentTicket || 'Student'}</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Switch / Log out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {userRole === 'admin' && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-teal-950/60 border border-teal-500/40 text-xs">
                  <KeyRound className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-teal-200 font-medium">Administrator</span>
                </div>
                <button
                  onClick={onLogout}
                  title="Switch / Log out"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Unauthenticated Role Buttons */}
            {!userRole && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenLogin('student')}
                  className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-violet-400" />
                  <span>Student Sign In</span>
                </button>

                <button
                  onClick={() => onOpenLogin('admin')}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-md shadow-violet-600/20 transition-all flex items-center space-x-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </button>
              </div>
            )}
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
