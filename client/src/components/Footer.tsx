import React from 'react';
import { ShieldAlert, Info, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 text-slate-400 py-10 mt-20 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Plain Language Anonymity Limitations Disclaimer */}
        <div className="mb-8 p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-200/90">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-300 text-sm mb-1">Anonymity & Privacy Limitations Disclaimer</h4>
              <p className="text-amber-200/80 leading-relaxed text-xs">
                Incognito protects your member identity using scope-bound nullifiers and zero-knowledge evidence structures. 
                However, <strong>anonymity cannot be cryptographically guaranteed against:</strong>
              </p>
              <ul className="list-disc list-inside mt-1.5 space-y-1 text-amber-200/70 font-mono text-[11px]">
                <li><strong>Contextual Inference:</strong> Writing highly unique incidents, exact timestamps, or ultra-specific classroom details.</li>
                <li><strong>Colluding Authorities:</strong> Network-level IP tracking outside Tor/VPN or verifier/reporting service co-location correlation.</li>
                <li><strong>Small Group Scope:</strong> Reports submitted within groups under the minimum privacy threshold (3 contributors) are suppressed.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div className="flex items-center space-x-2">
            <Lock className="w-3.5 h-3.5 text-violet-400" />
            <span>Incognito Campus Anonymity Platform &bull; Prototype Version 1.0.0</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">Simulated ZK Verifier Interface</span>
            <span>&bull;</span>
            <span className="text-slate-400">Scoped Nullifier Duplicate Guard</span>
            <span>&bull;</span>
            <span className="text-slate-400">Privacy Risk Gate</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
