import React, { useState, useEffect } from 'react';
import { fetchModeratorReports, updateReportStatus, ReportItem } from '../services/api';
import { PrivacyBadge } from '../components/PrivacyBadge';
import { LayoutDashboard, Lock, Key, ShieldAlert, CheckCircle2, XCircle, Edit3, Eye, RefreshCw, Filter, AlertTriangle, KeyRound, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';

interface ModeratorPageProps {
  adminToken?: string | null;
  onAdminLogin?: (token: string) => void;
  onLogout?: () => void;
}

export const ModeratorPage: React.FC<ModeratorPageProps> = ({
  adminToken: initialToken,
  onAdminLogin,
  onLogout,
}) => {
  const [token, setToken] = useState(initialToken || localStorage.getItem('incognito_admin_token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialToken || localStorage.getItem('incognito_admin_token')));
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected report for inspector/editor modal
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [editedSanitizedContent, setEditedSanitizedContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync token from props if updated
  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
      setIsAuthenticated(true);
    }
  }, [initialToken]);

  const loadReports = async (tokenToUse = token) => {
    if (!tokenToUse) {
      setIsAuthenticated(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchModeratorReports(tokenToUse, filterStatus);
      setReports(data);
      setIsAuthenticated(true);
      localStorage.setItem('incognito_admin_token', tokenToUse);
      if (onAdminLogin) onAdminLogin(tokenToUse);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error');
      if (err.message?.includes('Unauthorized') || err.message?.includes('Forbidden')) {
        setIsAuthenticated(false);
        localStorage.removeItem('incognito_admin_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadReports(token);
    }
  }, [filterStatus]);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports(token.trim());
  };

  const handleAdminLogout = () => {
    setToken('');
    setIsAuthenticated(false);
    setReports([]);
    localStorage.removeItem('incognito_admin_token');
    if (onLogout) onLogout();
  };

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      await updateReportStatus(
        token,
        reportId,
        newStatus,
        editedSanitizedContent.trim() ? editedSanitizedContent : undefined
      );
      setSelectedReport(null);
      await loadReports();
    } catch (err: any) {
      alert(err.message || 'Failed to update report status');
    } finally {
      setIsUpdating(false);
    }
  };

  // If NOT authenticated, render the dedicated Admin Login Screen
  if (!isAuthenticated) {
    return (
      <div className="py-12 flex items-center justify-center">
        <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 p-0.5 shadow-xl shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-teal-400" />
              </div>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Administrator Portal</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your staff or ombudsman secret key to access the moderation review queue and privacy sanitization tools.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Staff Secret Token</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Enter administrator bearer token"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white text-xs font-mono"
                  required
                />
              </div>
            </div>

            {/* Quick Demo Key Chip */}
            <div className="space-y-1">
              <span className="text-[11px] text-slate-500">Demo Key:</span>
              <button
                type="button"
                onClick={() => setToken('moderator-secret-token-2026')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-indigo-300 border border-slate-700 font-mono transition-colors block text-left"
              >
                moderator-secret-token-2026
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-teal-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-semibold text-xs tracking-wide shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In as Administrator'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Zero Reporter Identity Exposure Guaranteed</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      
      {/* Header & Auth State */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-white">Moderator Review Portal</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                Admin Authenticated
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Review privacy flags, redact sensitive context, approve for aggregate views, or escalate serious allegations.
            </p>
          </div>
        </div>

        {/* Authenticated Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => loadReports()}
            disabled={isLoading}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-all flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-medium transition-all flex items-center space-x-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Admin Sign Out</span>
          </button>
        </div>
      </div>

      {/* Strict Privacy Guarantee Box */}
      <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/20 text-xs text-violet-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span>
            <strong>Zero Reporter Exposure Guaranteed:</strong> Moderator views only display report content, category, and privacy flags. Student identity records, student IDs, and nullifiers are strictly excluded from response payloads.
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 space-x-2 border-b border-slate-800 text-xs">
        {[
          { id: 'all', label: 'All Reports' },
          { id: 'held_for_privacy_review', label: 'Held for Privacy Review' },
          { id: 'needs_sanitization', label: 'Needs Sanitization' },
          { id: 'approved_for_aggregation', label: 'Approved for Aggregation' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filterStatus === tab.id
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <span>Loading moderator reports from encrypted database...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-slate-800 text-slate-400 text-sm">
          No reports found matching the selected filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {reports.map((report) => {
            const flags = Array.isArray(report.privacyFlags) ? report.privacyFlags : [];
            const isSerious = report.isSeriousAllegation;

            return (
              <div
                key={report.id}
                className={`glass-panel p-5 rounded-2xl border transition-all ${
                  isSerious
                    ? 'border-rose-500/50 bg-rose-950/10'
                    : report.status === 'held_for_privacy_review'
                    ? 'border-amber-500/40 bg-amber-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {report.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Scope: {report.scopeId}</span>
                    {isSerious && (
                      <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Serious Grievance</span>
                      </span>
                    )}
                  </div>
                  <PrivacyBadge status={report.status} />
                </div>

                {/* Flags Warning Box */}
                {flags.length > 0 && (
                  <div className="mb-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center space-x-2">
                    <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                    <span>
                      <strong>Detected Privacy Risks:</strong> {flags.join(', ')}
                    </span>
                  </div>
                )}

                {/* Report Content Comparison */}
                <div className="space-y-2 mb-4 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">Original Text:</span>
                    <p className="text-slate-200 leading-relaxed font-sans">{report.content}</p>
                  </div>

                  {report.sanitizedContent && report.sanitizedContent !== report.content && (
                    <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30">
                      <span className="text-[10px] font-mono uppercase text-indigo-400 block mb-1">Auto-Sanitized Preview:</span>
                      <p className="text-indigo-200 leading-relaxed font-sans">{report.sanitizedContent}</p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Submitted: {new Date(report.createdAt).toLocaleString()}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setEditedSanitizedContent(report.sanitizedContent || report.content);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center space-x-1"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Edit & Redact</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(report.id, 'approved_for_aggregation')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Approve</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus(report.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 transition-all flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor & Sanitization Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>Sanitize & Redact Report</span>
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono block mb-1">Original Text:</span>
                <p className="p-3 rounded-lg bg-slate-950 text-slate-400 border border-slate-800">{selectedReport.content}</p>
              </div>

              <div>
                <span className="text-[10px] text-indigo-400 uppercase font-mono block mb-1">
                  Editable Redacted Version (Visible in Aggregates):
                </span>
                <textarea
                  rows={4}
                  value={editedSanitizedContent}
                  onChange={(e) => setEditedSanitizedContent(e.target.value)}
                  className="w-full p-3 rounded-lg glass-input text-slate-100 font-sans resize-none"
                  placeholder="Redact any accidental self-identifying statements..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800 text-xs">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus(selectedReport.id, 'approved_for_aggregation')}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white font-medium shadow-md shadow-indigo-600/20"
              >
                {isUpdating ? 'Saving...' : 'Save & Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
