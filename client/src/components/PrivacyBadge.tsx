import React from 'react';
import { CheckCircle2, ShieldAlert, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface PrivacyBadgeProps {
  status: string;
  isSeriousAllegation?: boolean;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({ status, isSeriousAllegation }) => {
  if (isSeriousAllegation) {
    return (
      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        <span>Serious Allegation (Independent Review)</span>
      </span>
    );
  }

  switch (status) {
    case 'approved_for_aggregation':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Approved for Aggregation</span>
        </span>
      );
    case 'needs_sanitization':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Needs Sanitization (Redaction)</span>
        </span>
      );
    case 'held_for_privacy_review':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-500/20 text-violet-300 border border-violet-500/30">
          <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
          <span>Held for Privacy Review</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
          <XCircle className="w-3.5 h-3.5 text-slate-500" />
          <span>Rejected</span>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
          {status}
        </span>
      );
  }
};
