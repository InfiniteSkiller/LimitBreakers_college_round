import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  kicker?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ icon: Icon, title, description, kicker, children }) => {
  return (
    <header className="brut-card-ink relative p-5 sm:p-7">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center border-[3px] border-paper bg-signal text-ink">
            <Icon className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            {kicker && <div className="brut-label mb-1 text-signal">{kicker}</div>}
            <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-wide sm:text-6xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper/85">{description}</p>
          </div>
        </div>
        {children && <div className="flex-shrink-0">{children}</div>}
      </div>
    </header>
  );
};
