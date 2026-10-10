import React, { useState } from 'react';
import { Shield, Lock, GraduationCap, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { fetchModeratorReports } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: 'student' | 'admin';
  onStudentLogin: (ticket: string) => void;
  onAdminLogin: (token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  defaultRole = 'student',
  onStudentLogin,
  onAdminLogin,
}) => {
  const [activeRole, setActiveRole] = useState<'student' | 'admin'>(defaultRole);

  // Student form state
  const [studentTicket, setStudentTicket] = useState('STU-ALICE-101');
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Admin form state
  const [adminToken, setAdminToken] = useState('moderator-secret-token-2026');
  const [showAdminToken, setShowAdminToken] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    const trimmed = studentTicket.trim();

    if (!trimmed) {
      setStudentError('Please enter a valid student ticket ID.');
      return;
    }

    if (!trimmed.toUpperCase().startsWith('STU-')) {
      setStudentError('Student ticket must follow the STU-XXXX format.');
      return;
    }

    setStudentLoading(true);
    try {
      onStudentLogin(trimmed.toUpperCase());
      onClose();
    } catch (err: any) {
      setStudentError(err.message || 'Failed to sign in as student');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const trimmed = adminToken.trim();

    if (!trimmed) {
      setAdminError('Please enter the administrative secret token.');
      return;
    }

    setAdminLoading(true);
    try {
      // Validate token against backend admin endpoint
      await fetchModeratorReports(trimmed);
      onAdminLogin(trimmed);
      onClose();
    } catch (err: any) {
      setAdminError(err.message || 'Invalid administrator secret token');
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg rounded-2xl glass-panel bg-slate-900/95 border border-slate-700/80 shadow-2xl overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-teal-400 p-0.5 shadow-lg shadow-violet-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Shield className="w-6 h-6 text-teal-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Access Incognito Portal</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Choose your role to authenticate securely with zero-knowledge verification or administrator oversight.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-slate-950/80 border border-slate-800">
          <button
            type="button"
            onClick={() => { setActiveRole('student'); setStudentError(null); }}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeRole === 'student'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Student / User</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveRole('admin'); setAdminError(null); }}
            className={`flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeRole === 'admin'
                ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Administrator</span>
          </button>
        </div>

        {/* Student Form */}
        {activeRole === 'student' && (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>College Student Ticket ID</span>
                <span className="text-[10px] text-teal-400 font-mono">Format: STU-XXXX</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={studentTicket}
                  onChange={(e) => setStudentTicket(e.target.value)}
                  placeholder="e.g. STU-ALICE-101"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-white text-sm placeholder-slate-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Quick Demo Tickets */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400">Quick Demo Accounts:</span>
              <div className="flex flex-wrap gap-2">
                {['STU-ALICE-101', 'STU-BOB-202', 'STU-DEMO-2026'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setStudentTicket(t)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 font-mono transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {studentError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span>{studentError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-slate-300 text-[11px] space-y-1">
              <div className="flex items-center space-x-1.5 text-violet-300 font-medium">
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                <span>Cryptographic Privacy Guarantee</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your ticket generates a client-side Semaphore identity. Feedback submissions use zero-knowledge proofs and are mathematically untraceable to your ticket.
              </p>
            </div>

            <button
              type="submit"
              disabled={studentLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 text-white font-semibold text-xs tracking-wide shadow-lg shadow-violet-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <GraduationCap className="w-4 h-4" />
              <span>{studentLoading ? 'Verifying Identity...' : 'Sign In as Student'}</span>
            </button>
          </form>
        )}

        {/* Admin Form */}
        {activeRole === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Administrator Secret Key</span>
                <span className="text-[10px] text-indigo-400 font-mono">Protected Portal</span>
              </label>
              <div className="relative">
                <input
                  type={showAdminToken ? 'text' : 'password'}
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)}
                  placeholder="Enter administrator secret key"
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950/90 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-sm placeholder-slate-500 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowAdminToken(!showAdminToken)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showAdminToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Key */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-slate-400">Default Demo Key:</span>
              <button
                type="button"
                onClick={() => setAdminToken('moderator-secret-token-2026')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 font-mono transition-colors block text-left"
              >
                moderator-secret-token-2026
              </button>
            </div>

            {adminError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span>{adminError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-slate-300 text-[11px] space-y-1">
              <div className="flex items-center space-x-1.5 text-indigo-300 font-medium">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Moderator & Staff Access</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Grants access to the privacy sanitization queue, serious grievance escalation, and unredacted PII moderation review.
              </p>
            </div>

            <button
              type="submit"
              disabled={adminLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-teal-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{adminLoading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
