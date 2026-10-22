import React, { useState, useEffect } from 'react';
import { fetchModeratorReports, updateReportStatus, ReportItem } from '../services/api';
import { PrivacyBadge } from '../components/PrivacyBadge';
import { PageHeader } from '../components/PageHeader';
import { LayoutDashboard, Lock, Key, CheckCircle2, XCircle, Edit3, RefreshCw, AlertTriangle, X, Inbox, Loader2 } from 'lucide-react';

export const ModeratorPage: React.FC = () => {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    if (isAuthenticated) loadReports();
  }, [filterStatus, isAuthenticated]);

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

  const FILTERS = [
    { id: 'all', label: 'All reports' },
    { id: 'held_for_privacy_review', label: 'Held for review' },
    { id: 'needs_sanitization', label: 'Needs redaction' },
    { id: 'approved_for_aggregation', label: 'Approved' },
    { id: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="space-y-8 py-4">
      <PageHeader
        icon={LayoutDashboard}
        kicker="Moderator portal"
        title="Review queue"
        description="Review privacy flags, redact sensitive context, approve reports for aggregate views, or escalate serious allegations."
      >
        <form onSubmit={handleAuthSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <label htmlFor="mod-token" className="sr-only">Moderator bearer token</label>
            <Key className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" strokeWidth={2.75} />
            <input
              id="mod-token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="brut-field w-60 !pl-9"
              placeholder="Moderator token"
            />
          </div>
          <button type="submit" className="brut-btn">
            <span>Authenticate</span>
          </button>
        </form>
      </PageHeader>

      {/* Privacy note + refresh */}
      <div className="brut-card-yellow flex items-center justify-between gap-4 p-4 !shadow-hard-sm">
        <div className="flex items-start gap-3 text-xs leading-relaxed">
          <Lock className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.75} />
          <span>
            <strong className="uppercase tracking-wider">No reporter identity in this view.</strong> Moderators see report
            content, category and privacy flags only. Student identity records, student IDs and nullifiers are excluded
            from these responses.
          </span>
        </div>
        <button type="button" onClick={loadReports} className="brut-btn brut-btn-paper brut-btn-sm flex-shrink-0" aria-label="Refresh reports list">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} strokeWidth={3} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Report status filter">
        {FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filterStatus === tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`flex-shrink-0 border-[3px] border-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-[transform,box-shadow] duration-100 ${
              filterStatus === tab.id ? 'bg-ink text-signal shadow-hard-sm' : 'bg-card hover:-translate-y-0.5 hover:shadow-hard-sm'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div role="alert" className="flex items-center gap-2 border-[3px] border-ink bg-alarm p-4 text-sm font-bold">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" strokeWidth={2.75} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Reports */}
      <div className="grid grid-cols-1 gap-6">
        {reports.length === 0 && !isLoading ? (
          <div className="brut-card flex flex-col items-center gap-3 p-12 text-center">
            <Inbox className="h-10 w-10" strokeWidth={2} />
            <p className="font-display text-3xl uppercase tracking-wide">Nothing here</p>
            <p className="text-sm text-steel">No reports found for the selected status filter.</p>
          </div>
        ) : (
          reports.map((report) => (
            <article key={report.id} className="brut-card overflow-hidden">
              {report.isSeriousAllegation && <div className="hazard h-3 border-b-[3px] border-ink" />}

              <div className="space-y-4 p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="brut-tag brut-tag-ink">{report.category}</span>
                    <span className="font-mono text-xs font-bold">Scope: {report.scopeId}</span>
                    <span className="font-mono text-xs text-steel">{new Date(report.createdAt).toLocaleDateString()}</span>
                  </div>
                  <PrivacyBadge status={report.status} isSeriousAllegation={report.isSeriousAllegation} />
                </div>

                {/* Content */}
                <div className="brut-inset p-4 text-sm leading-relaxed">
                  {report.sanitizedContent ? (
                    <div className="space-y-2">
                      <span className="brut-tag brut-tag-signal">Sanitized draft excerpt</span>
                      <p>{report.sanitizedContent}</p>
                    </div>
                  ) : (
                    <p>{report.content}</p>
                  )}
                </div>

                {/* Flags */}
                {report.privacyFlags && report.privacyFlags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="brut-label !mb-0">Privacy flags</span>
                    {report.privacyFlags.map((flag, idx) => (
                      <span key={idx} className="brut-tag brut-tag-signal">
                        <AlertTriangle className="h-3 w-3" strokeWidth={3} />
                        {flag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-dashed border-ink pt-4">
                  <span className="font-mono text-[0.7rem] text-steel">ID {report.id.substring(0, 8)}...</span>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReport(report);
                        setEditedSanitizedContent(report.sanitizedContent || report.content);
                      }}
                      className="brut-btn brut-btn-paper brut-btn-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5" strokeWidth={2.75} />
                      <span>Inspect & redact</span>
                    </button>

                    {report.status !== 'approved_for_aggregation' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(report.id, 'approved_for_aggregation')}
                        className="brut-btn brut-btn-go brut-btn-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.75} />
                        <span>Approve</span>
                      </button>
                    )}

                    {report.status !== 'rejected' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(report.id, 'rejected')}
                        className="brut-btn brut-btn-alarm brut-btn-sm"
                      >
                        <XCircle className="h-3.5 w-3.5" strokeWidth={2.75} />
                        <span>Reject</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Inspector / sanitization modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sanitize-title"
        >
          <div className="brut-card max-h-[90vh] w-full max-w-2xl overflow-y-auto !shadow-hard-lg">
            <div className="flex items-center justify-between gap-3 border-b-[3px] border-ink bg-signal px-5 py-3 text-ink">
              <h2 id="sanitize-title" className="font-display text-3xl uppercase tracking-wide">Sanitize & redact</h2>
              <button type="button" onClick={() => setSelectedReport(null)} className="brut-btn brut-btn-paper brut-btn-sm" aria-label="Close dialog">
                <X className="h-4 w-4" strokeWidth={3.5} />
                <span>Close</span>
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div>
                <span className="brut-label">Raw original content (read-only)</span>
                <div className="brut-inset max-h-36 overflow-y-auto p-3 font-mono text-xs leading-relaxed">
                  {selectedReport.content}
                </div>
              </div>

              <div>
                <label htmlFor="sanitized" className="brut-label">Sanitized version for the aggregated feed</label>
                <textarea
                  id="sanitized"
                  rows={5}
                  value={editedSanitizedContent}
                  onChange={(e) => setEditedSanitizedContent(e.target.value)}
                  className="brut-field font-sans text-sm"
                  placeholder="Replace personal names, dates or emails with [REDACTED]..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t-[3px] border-dashed border-ink pt-4">
                <button type="button" onClick={() => setSelectedReport(null)} className="brut-btn brut-btn-paper">
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedReport.id, 'held_for_privacy_review')}
                  disabled={isUpdating}
                  className="brut-btn brut-btn-ink"
                >
                  Hold for privacy review
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedReport.id, 'approved_for_aggregation')}
                  disabled={isUpdating}
                  className="brut-btn brut-btn-go"
                >
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} />}
                  <span>Save & approve</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
