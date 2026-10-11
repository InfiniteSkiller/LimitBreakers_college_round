import React from 'react';
import {
  Shield, Lock, EyeOff, ShieldAlert, Cpu, BarChart3, ArrowRight, ArrowUpRight,
  Asterisk, Ban, Check, Fingerprint, Network, Eye, FileWarning,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateSubmit: () => void;
  onNavigateSecurity: () => void;
}

const MARQUEE_ITEMS = [
  'No names',
  'No student IDs',
  'Scoped nullifiers',
  'Groth16 proofs',
  'Privacy risk gate',
  'Minimum 3 contributors',
];

const PILLARS = [
  {
    icon: Shield,
    title: 'Verified membership',
    text: 'Proves you belong to the college without sending your name, email or student ID to the reporting endpoint.',
    surface: 'brut-card',
    iconBox: 'bg-ink text-signal',
  },
  {
    icon: Fingerprint,
    title: 'Scoped nullifiers',
    text: 'One report per member per scope (e.g. teaching:2026-Q4). Nullifiers are scope-specific; other metadata or report text may still allow correlation.',
    surface: 'brut-card-yellow',
    iconBox: 'bg-ink text-signal',
  },
  {
    icon: EyeOff,
    title: 'Privacy risk gate',
    text: 'Drafts and submissions are scanned for names, emails, phone numbers, dates and rooms before anything is aggregated.',
    surface: 'brut-card',
    iconBox: 'bg-ink text-signal',
  },
  {
    icon: BarChart3,
    title: 'Threshold aggregation',
    text: 'Recipients see category summaries only once at least 3 members have contributed, which prevents micro-targeting.',
    surface: 'brut-card-ink',
    iconBox: 'bg-signal text-ink',
  },
];

const LIMITS = [
  {
    icon: Eye,
    title: 'Contextual details',
    text: 'If a reporter writes details that only two people know, recipients can infer identity regardless of the cryptography.',
  },
  {
    icon: Network,
    title: 'Network side-channels',
    text: 'Browser IP addresses and request timestamps could be correlated if the verifier and report servers collude.',
  },
  {
    icon: FileWarning,
    title: 'Prototype boundary',
    text: 'Enrollment is a demo check on ticket prefixes (STU- or DEMO-). It is not verified against a real college registry.',
  },
];

const Marquee: React.FC = () => {
  const row = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden border-y-[3px] border-ink bg-ink text-signal" aria-hidden="true">
      <div className="flex w-max animate-marquee">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex flex-shrink-0 items-center">
            {row.map((item, i) => (
              <span key={`${copy}-${i}`} className="flex items-center gap-6 px-6 py-2 font-display text-3xl uppercase tracking-wider">
                {item}
                <Asterisk className="h-6 w-6" strokeWidth={3} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateSubmit, onNavigateSecurity }) => {
  return (
    <div className="space-y-20 py-4">
      {/* Hero */}
      <section className="grid items-start gap-10 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <div className="border-[3px] border-ink shadow-hard-lg">
            <div className="bg-ink p-6 text-paper sm:p-10">
              <span className="brut-tag brut-tag-signal">
                <Lock className="h-3.5 w-3.5" strokeWidth={2.75} />
                Zero-knowledge campus feedback
              </span>
              <h1 className="mt-5 font-display text-[4.25rem] uppercase leading-[0.88] tracking-wide sm:text-[7rem]">
                Say it.
                <br />
                <span className="text-signal">Stay unnamed.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-paper/85">
                <strong className="text-paper">Incognito</strong> lets verified college members report safety
                concerns, academic feedback and administrative issues without exposing a student ID, name or email
                to the people who read the reports.
              </p>
            </div>

            <button
              type="button"
              onClick={onNavigateSubmit}
              className="group flex w-full items-center justify-center gap-4 border-t-[3px] border-ink bg-signal px-6 py-5 font-display text-4xl uppercase tracking-widest transition-colors hover:bg-[#FFE07A]"
            >
              <span>Submit a report</span>
              <ArrowRight className="h-8 w-8 transition-transform group-hover:translate-x-2" strokeWidth={3} />
            </button>
          </div>

          <div className="mt-7 flex flex-wrap gap-4">
            <button type="button" onClick={onNavigateSecurity} className="brut-btn brut-btn-paper">
              <Cpu className="h-4 w-4" strokeWidth={2.75} />
              <span>Security architecture</span>
              <ArrowUpRight className="h-4 w-4" strokeWidth={2.75} />
            </button>
          </div>
        </div>

        {/* Receipt sticker */}
        <div className="relative lg:pt-6">
          <div className="relative rotate-[2deg]">
            <div className="brut-card font-mono text-xs">
              <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-4 py-3 text-paper">
                <span className="font-display text-3xl uppercase tracking-wider">Proof receipt</span>
                <span className="brut-tag brut-tag-signal">Example</span>
              </div>

              <dl className="divide-y-2 divide-dashed divide-ink px-4">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="font-bold uppercase">Name</dt>
                  <dd className="brut-tag"><Ban className="h-3 w-3" strokeWidth={3} />Not sent</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="font-bold uppercase">Student ID</dt>
                  <dd className="brut-tag"><Ban className="h-3 w-3" strokeWidth={3} />Not sent</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="font-bold uppercase">Scope</dt>
                  <dd className="truncate">teaching:2026-Q4</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="font-bold uppercase">Nullifier</dt>
                  <dd className="truncate">0x7f8a...e931</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="font-bold uppercase">Proof</dt>
                  <dd className="brut-tag brut-tag-go"><Check className="h-3 w-3" strokeWidth={3.5} />Groth16</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="font-bold uppercase">2nd report, same scope</dt>
                  <dd className="brut-tag brut-tag-alarm">Blocked</dd>
                </div>
              </dl>

              <div className="barcode m-4 h-10" />
            </div>

            <div className="absolute -bottom-5 -right-3 rotate-[-8deg] border-[3px] border-ink bg-alarm px-3 py-0.5 font-display text-3xl uppercase tracking-wider shadow-hard-sm">
              Anon
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { n: '0', l: 'Names sent' },
              { n: '1', l: 'Report per scope' },
              { n: '3+', l: 'To show results' },
            ].map((stat) => (
              <div key={stat.l} className="brut-card-yellow p-3 text-center !shadow-hard-sm">
                <div className="font-display text-5xl leading-none">{stat.n}</div>
                <div className="mt-1 font-mono text-[0.62rem] font-bold uppercase leading-tight tracking-wider">{stat.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Marquee />

      {/* Pillars */}
      <section className="space-y-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-6xl uppercase leading-none tracking-wide sm:text-7xl">
            Four pillars
            <span className="ml-3 inline-block h-3 w-16 translate-y-[-0.6rem] bg-signal border-[3px] border-ink" />
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-steel">
            Eligibility is verified separately from the report itself, using scoped cryptographic nullifiers.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <article
                key={pillar.title}
                className={`${pillar.surface} flex flex-col gap-4 p-6 transition-transform duration-100 hover:-translate-y-1`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex h-12 w-12 items-center justify-center border-[3px] border-ink ${pillar.iconBox}`}>
                    <Icon className="h-6 w-6" strokeWidth={2.75} />
                  </div>
                  <span className="font-display text-5xl leading-none opacity-30">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="font-display text-3xl uppercase leading-none tracking-wide">{pillar.title}</h3>
                <p className="text-sm leading-relaxed">{pillar.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      {/* Honest limits */}
      <section className="brut-card overflow-hidden">
        <div className="hazard h-4 border-b-[3px] border-ink" />
        <div className="space-y-6 p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 flex-shrink-0" strokeWidth={2.5} />
            <h2 className="font-display text-4xl uppercase tracking-wide sm:text-5xl">Honest limits</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {LIMITS.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="brut-inset space-y-2 p-4">
                  <div className="flex items-center justify-between">
                    <span className="brut-label !mb-0 text-steel">Limit {String(i + 1).padStart(2, '0')}</span>
                    <Icon className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-display text-2xl uppercase tracking-wide">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-steel">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
