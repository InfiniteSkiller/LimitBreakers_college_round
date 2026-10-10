import React from 'react';
import { ShieldCheck, EyeOff, AlertTriangle } from 'lucide-react';

export const PrivacyWarning: React.FC = () => {
  return (
    <div className="p-4 rounded-xl bg-violet-950/30 border border-violet-500/20 text-slate-200 text-xs leading-relaxed space-y-2">
      <div className="flex items-center space-x-2 text-violet-300 font-semibold text-sm">
        <ShieldCheck className="w-4 h-4 text-violet-400" />
        <span>Privacy Protection Rules Before Submitting</span>
      </div>
      <ul className="space-y-1.5 text-slate-300 list-disc list-inside font-sans text-xs">
        <li><strong>Do NOT include your name, student ID, email address, or phone number.</strong></li>
        <li>Avoid specifying exact dates, times, room numbers, or small class group sizes that could identify you.</li>
        <li>Your feedback is bound to a <strong>scoped nullifier</strong> — preventing duplicate submissions while keeping your report cryptographically un-linkable across categories.</li>
        <li>Submissions with potential identifiers will be held in a <strong>privacy-review queue</strong> for sanitization.</li>
      </ul>
    </div>
  );
};
