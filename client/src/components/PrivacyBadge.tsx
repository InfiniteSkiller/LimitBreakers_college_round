import React from 'react';
import { CheckCircle2, ShieldAlert, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react';

interface PrivacyBadgeProps {
  status: string;
  isSeriousAllegation?: boolean;
}

export const PrivacyBadge: React.FC<PrivacyBadgeProps> = ({ status, isSeriousAllegation }) => {
  if (isSeriousAllegation) {
    return (
      <span className="brut-tag brut-tag-alarm">
        <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2.75} />
        <span>Serious allegation / independent review</span>
      </span>
    );
  }

  switch (status) {
    case 'approved_for_aggregation':
      return (
        <span className="brut-tag brut-tag-go">
          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.75} />
          <span>Approved for aggregation</span>
        </span>
      );
    case 'needs_sanitization':
      return (
        <span className="brut-tag brut-tag-signal">
          <AlertTriangle className="h-3.5 w-3.5" strokeWidth={2.75} />
          <span>Needs redaction</span>
        </span>
      );
    case 'held_for_privacy_review':
      return (
        <span className="brut-tag brut-tag-ink">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.75} />
          <span>Held for privacy review</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="brut-tag text-steel">
          <XCircle className="h-3.5 w-3.5" strokeWidth={2.75} />
          <span className="line-through">Rejected</span>
        </span>
      );
    default:
      return <span className="brut-tag">{status}</span>;
  }
};
