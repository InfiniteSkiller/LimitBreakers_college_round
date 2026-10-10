import React from 'react';
import { Shield, Lock, EyeOff, ShieldAlert, Cpu, BarChart3, ArrowRight, CheckCircle2, AlertCircle, GraduationCap, KeyRound } from 'lucide-react';
import { UserRole } from '../components/Navbar';

interface LandingPageProps {
  onNavigateSubmit: () => void;
  onNavigateSecurity: () => void;
  onOpenLogin?: (role?: 'student' | 'admin') => void;
  userRole?: UserRole;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateSubmit,
  onNavigateSecurity,
  onOpenLogin,
  userRole,
}) => {
  return (
    <div className="space-y-16 py-6">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-8 sm:p-12 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-mono">
            <Lock className="w-3.5 h-3.5 text-teal-400" />
            <span>Zero-Knowledge College Feedback Infrastructure</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Anonymous Feedback. <br />
            <span className="gradient-text">Zero Compromise. Zero Tracking.</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-light">
            <strong>Incognito</strong> enables verified college members to report safety concerns, academic feedback, and administrative issues without exposing their student ID, name, email, or digital footprint to report recipients.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 items-center">
            <button
              onClick={onNavigateSubmit}
              className="bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white font-semibold text-sm px-6 py-3.5 rounded-xl shadow-lg shadow-violet-600/25 transition-all flex items-center space-x-2 group"
            >
              <span>Submit Anonymous Feedback</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {onOpenLogin && !userRole && (
              <>
                <button
                  onClick={() => onOpenLogin('student')}
                  className="glass-panel hover:bg-slate-800/80 text-teal-300 font-medium text-sm px-5 py-3.5 rounded-xl transition-all border border-teal-500/30 flex items-center space-x-2"
                >
                  <GraduationCap className="w-4 h-4 text-teal-400" />
                  <span>Student Sign-In</span>
                </button>

                <button
                  onClick={() => onOpenLogin('admin')}
                  className="glass-panel hover:bg-slate-800/80 text-amber-300 font-medium text-sm px-5 py-3.5 rounded-xl transition-all border border-amber-500/30 flex items-center space-x-2"
                >
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Admin Portal</span>
                </button>
              </>
            )}

            <button
              onClick={onNavigateSecurity}
              className="glass-panel hover:bg-slate-800/80 text-slate-200 font-medium text-sm px-5 py-3.5 rounded-xl transition-all border border-slate-700 flex items-center space-x-2"
            >
              <Cpu className="w-4 h-4 text-teal-400" />
              <span>Explore Security</span>
            </button>
          </div>
        </div>
      </section>

      {/* Core Privacy Pillars Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-2xl font-bold text-white tracking-tight">Four Pillars of Incognito Privacy</h2>
          <p className="text-slate-400 text-sm">
            Architected to decouple eligibility verification from report submission using cryptographic scoped nullifiers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pillar 1 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 hover:border-violet-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Verified Membership</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Verifies eligible college membership without transmitting student names, emails, or student IDs to the reporting endpoint.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 hover:border-teal-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Scoped Nullifiers</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Enforces 1 report per member per scope (e.g. teaching:2026-Q4). Submissions across different scopes are cryptographically un-linkable.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 hover:border-indigo-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Privacy Risk Gate</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Automated pre-submission and server inspection flags direct identifiers (names, emails, phone numbers) and specific contextual dates/rooms.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="glass-card p-6 rounded-2xl space-y-3 hover:border-cyan-500/40 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-white text-base">Threshold Aggregation</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Recipients only view category summary metrics when the minimum contributor threshold (&ge;3 members) is satisfied to prevent micro-targeting.
            </p>
          </div>

        </div>
      </section>

      {/* Honest Anonymity & Limitations Section */}
      <section className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-3 text-amber-400">
          <ShieldAlert className="w-6 h-6 flex-shrink-0" />
          <h3 className="text-lg font-bold text-amber-300">Honest Anonymity & Technical Security Limits</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-200">Contextual Details</div>
            <p className="text-slate-400">
              If a reporter writes details known to only 2 people, recipients can infer identity regardless of cryptography.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-200">Network Side-Channels</div>
            <p className="text-slate-400">
              Browser IP addresses and request timestamps could be correlated if verifier and report servers collude.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
            <div className="font-semibold text-slate-200">Simulation Boundary</div>
            <p className="text-slate-400">
              Prototype 1 uses a deterministic HMAC nullifier interface simulating ZKP structures for rapid demonstration.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
};
