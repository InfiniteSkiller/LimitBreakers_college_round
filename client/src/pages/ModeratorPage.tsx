import React, { useState, useEffect } from 'react';
import { fetchModeratorReports, updateReportStatus, ReportItem } from '../services/api';
import { PrivacyBadge } from '../components/PrivacyBadge';
import { LayoutDashboard, Lock, Key, ShieldAlert, CheckCircle2, XCircle, Edit3, Eye, RefreshCw, Filter, AlertTriangle } from 'lucide-react';

export const ModeratorPage: React.FC = () => {
  const [token, setToken] = useState('moderator-secret-token-2026');
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Selected report for inspector/editor modal
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [editedSanitizedContent, setEditedSanitizedContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadReports = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchModeratorReports(token, filterStatus);
      setReports(data);
      setIsAuthenticated(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication error');
      if (err.message?.includes('Unauthorized') || err.message?.includes('Forbidden')) {
        setIsAuthenticated(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [filterStatus]);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadReports();
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

  return (
    <div className="space-y-8 py-4">
      
      {/* Header & Auth State */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Moderator Review Portal</h1>
            <p className="text-slate-400 text-xs">
              Review privacy flags, redact sensitive context, approve for aggregate views, or escalate serious allegations.
            </p>
          </div>
        </div>

        {/* Authenticated Status Toggle */}
        <form onSubmit={handleAuthSubmit} className="flex items-center space-x-2">
          <div className="relative">
            <Key className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg glass-input text-xs font-mono w-56"
              placeholder="Moderator Bearer Token"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all"
          >
            Authenticate
          </button>
        </form>
      </div>

      {/* Strict Privacy Guarantee Box */}
      <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/20 text-xs text-violet-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-violet-400 flex-shrink-0" />
          <span>
            <strong>Zero Reporter Exposure Guaranteed:</strong> Moderator views only display report content, category, and privacy flags. Student identity records, student IDs, and nullifiers are strictly excluded from response payloads.
          </span>
        </div>
        <button
          onClick={loadReports}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all ml-2"
          title="Refresh reports list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex overflow-x-auto pb-2 space-x-2 border-b border-slate-800 text-xs">
        {[
          { id: 'all', label: 'All Reports' },
          { id: 'held_for_privacy_review', label: 'Held for Privacy Review' },
          { id: 'needs_sanitization', label: 'Needs Redaction' },
          { id: 'approved_for_aggregation', label: 'Approved' },
          { id: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              filterStatus === tab.id
                ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                : 'text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Reports List Grid */}
      <div className="grid grid-cols-1 gap-4">
        {reports.length === 0 && !isLoading ? (
          <div className="glass-card p-12 text-center text-slate-400 text-xs rounded-2xl">
            No reports found for the selected status filter.
          </div>
        ) : (
          reports.map((report) => (
            <div
              key={report.id}
              className={`glass-card p-5 rounded-2xl border transition-all space-y-3 ${
                report.isSeriousAllegation
                  ? 'border-rose-500/40 bg-rose-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white text-xs uppercase tracking-wide px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {report.category}
                  </span>
                  <span className="text-slate-400 text-xs font-mono">Scope: {report.scopeId}</span>
                  <span className="text-slate-500 text-[11px]">
                    Submitted: {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <PrivacyBadge status={report.status} isSeriousAllegation={report.isSeriousAllegation} />
              </div>

              {/* Content Body */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-slate-200 text-xs font-sans leading-relaxed">
                {report.sanitizedContent ? (
                  <div className="space-y-1">
                    <span className="text-[10px] text-amber-400 font-mono uppercase font-semibold">[Sanitized Draft Excerpt]:</span>
                    <p>{report.sanitizedContent}</p>
                  </div>
                ) : (
                  <p>{report.content}</p>
                )}
              </div>

              {/* Flags List */}
              {report.privacyFlags && report.privacyFlags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-slate-400 font-medium">Privacy Flags:</span>
                  {report.privacyFlags.map((flag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-500/30 font-mono">
                      ⚠️ {flag}
                    </span>
                  ))}
                </div>
              )}

              {/* Moderator Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <span className="text-[11px] text-slate-500 font-mono">Report ID: {report.id.substring(0, 8)}...</span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedReport(report);
                      setEditedSanitizedContent(report.sanitizedContent || report.content);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Inspect & Redact</span>
                  </button>

                  {report.status !== 'approved_for_aggregation' && (
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'approved_for_aggregation')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-medium transition-all flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Approve</span>
                    </button>
                  )}

                  {report.status !== 'rejected' && (
                    <button
                      onClick={() => handleUpdateStatus(report.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-medium transition-all flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Inspector / Sanitization Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl max-w-2xl w-full border border-slate-700 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Sanitize & Redact Report Content</h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 text-xs font-semibold">Raw Original Content (Read-Only):</label>
              <div className="p-3 rounded-lg bg-slate-950 text-slate-300 text-xs font-mono leading-relaxed border border-slate-800 max-h-32 overflow-y-auto">
                {selectedReport.content}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-300 text-xs font-semibold">Sanitized Version for Aggregated Feed:</label>
              <textarea
                rows={4}
                value={editedSanitizedContent}
                onChange={(e) => setEditedSanitizedContent(e.target.value)}
                className="w-full p-3 rounded-lg glass-input text-xs font-sans leading-relaxed"
                placeholder="Replace personal names, dates, or emails with [REDACTED]..."
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-lg glass-panel hover:bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              
              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'held_for_privacy_review')}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-violet-600/30 hover:bg-violet-600/40 text-violet-300 border border-violet-500/40 text-xs"
              >
                Hold for Privacy Review
              </button>

              <button
                onClick={() => handleUpdateStatus(selectedReport.id, 'approved_for_aggregation')}
                disabled={isUpdating}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md"
              >
                Save & Approve for Aggregation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
