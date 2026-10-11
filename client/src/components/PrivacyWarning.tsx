import React from 'react';
import { ShieldCheck, Ban, Clock, Fingerprint, Inbox } from 'lucide-react';

const RULES = [
  { icon: Ban, text: 'Do NOT include your name, student ID, email address or phone number.' },
  { icon: Clock, text: 'Avoid exact dates, times, room numbers or small class sizes that could identify you.' },
  { icon: Fingerprint, text: 'A scoped nullifier stops duplicate submissions while keeping your reports unlinkable across categories.' },
  { icon: Inbox, text: 'Reports with possible identifiers go to a privacy-review queue for redaction.' },
];

export const PrivacyWarning: React.FC = () => {
  return (
    <aside className="brut-card-yellow">
      <div className="flex items-center gap-2 border-b-[3px] border-ink bg-ink px-4 py-2.5 text-signal">
        <ShieldCheck className="h-5 w-5" strokeWidth={2.75} />
        <h2 className="font-display text-2xl uppercase tracking-wide">Before you submit</h2>
      </div>
      <ul className="space-y-3 p-4">
        {RULES.map((rule, i) => {
          const Icon = rule.icon;
          return (
            <li key={i} className="flex items-start gap-3 text-xs leading-relaxed">
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center border-2 border-ink bg-paper">
                <Icon className="h-3.5 w-3.5" strokeWidth={2.75} />
              </span>
              <span className="pt-0.5 font-medium">{rule.text}</span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
