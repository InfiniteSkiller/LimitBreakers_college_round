import React from 'react';
import { ShieldAlert, Lock, Eye, Network, Users } from 'lucide-react';

const LIMITS = [
  {
    icon: Eye,
    title: 'Contextual inference',
    text: 'Unique incidents, exact timestamps or ultra-specific classroom details can identify you.',
  },
  {
    icon: Network,
    title: 'Colluding authorities',
    text: 'IP tracking outside Tor or a VPN, or verifier and report servers comparing notes.',
  },
  {
    icon: Users,
    title: 'Small groups',
    text: 'Groups under the minimum threshold of 3 contributors are suppressed from summaries.',
  },
];

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 mt-24 border-t-[3px] border-ink bg-ink text-paper">
      <div className="hazard h-4 border-b-[3px] border-ink" />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Anonymity limits */}
        <div className="border-[3px] border-paper bg-signal text-ink shadow-[8px_8px_0_0_#EFEBDD]">
          <div className="flex items-center gap-3 border-b-[3px] border-ink bg-ink px-5 py-3 text-signal">
            <ShieldAlert className="h-6 w-6" strokeWidth={2.5} />
            <h2 className="font-display text-3xl uppercase tracking-wide">Read this: what anonymity does not cover</h2>
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-3">
            {LIMITS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center border-[3px] border-ink bg-paper">
                    <Icon className="h-4 w-4" strokeWidth={2.75} />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold uppercase tracking-wider">{item.title}</div>
                    <p className="mt-1 text-xs leading-relaxed">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-4 font-mono text-[0.7rem] uppercase tracking-wider md:flex-row md:items-center">
          <div className="flex items-center gap-2 text-signal">
            <Lock className="h-4 w-4" strokeWidth={2.75} />
            <span>Incognito campus anonymity platform / Prototype 1.0.0</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-paper/80">
            <span>Semaphore V4 proofs</span>
            <span>Scoped nullifier guard</span>
            <span>Privacy risk gate</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
