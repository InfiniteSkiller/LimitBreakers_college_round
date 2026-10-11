import React from 'react';
import { Fingerprint } from 'lucide-react';

/**
 * Fixed, purely decorative layer behind the page: faded icon, outlined
 * letters, tilted shapes and a circular stamp. Hidden from assistive tech.
 */
export const BackgroundDecor: React.FC = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* tilted yellow block */}
      <div className="absolute left-[1.5%] top-[18%] hidden h-12 w-12 rotate-[8deg] border-[3px] border-ink bg-signal shadow-hard-sm md:block" />

      {/* big faded icon, top right */}
      <Fingerprint
        className="absolute -right-12 top-24 hidden h-96 w-96 text-ink opacity-[0.07] lg:block"
        strokeWidth={1.25}
      />

      {/* outlined letters, bottom left */}
      <div className="absolute -left-6 bottom-[-2rem] select-none font-display text-[20rem] leading-none text-transparent [-webkit-text-stroke:3px_rgba(11,11,11,0.10)]">
        ZK
      </div>
      <div className="absolute bottom-24 left-10 hidden h-44 w-44 -rotate-12 border-[3px] border-ink/20 md:block" />

      {/* circular stamp, bottom right */}
      <div className="absolute -right-10 bottom-[8%] hidden h-56 w-56 items-center justify-center rounded-full border-[3px] border-ink/20 md:flex">
        <div className="-rotate-[8deg] border-[3px] border-ink/30 bg-ink/5 px-3 py-1 font-mono text-sm font-bold uppercase tracking-widest text-ink/40">
          No names
        </div>
      </div>
    </div>
  );
};
