import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Cpu, Key, Layers, CheckCircle2, AlertTriangle, ArrowRight, Fingerprint, ServerCog, EyeOff, BarChart3, Link2 } from 'lucide-react';

export const SecurityArchitecturePage: React.FC = () => {
  // Live Interactive Nullifier Sandbox state
  const [sandboxSecret, setSandboxSecret] = useState('student_secret_passphrase_77');
  const [sandboxScope, setSandboxScope] = useState('teaching:2026-Q4');
  const [sandboxScopeB, setSandboxScopeB] = useState('facilities:2026-Q4');

  // Simple H(secret, scope) calculation demo
  const computeSimpleHash = (secret: string, scope: string) => {
    let hash = 0;
    const str = `${secret.trim().toLowerCase()}:${scope}`;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `0x7f8a${hex}e931b402019a8421098520f9241e${hex}`;
  };

  const nullifierScopeA = computeSimpleHash(sandboxSecret, sandboxScope);
  const nullifierScopeB = computeSimpleHash(sandboxSecret, sandboxScopeB);

  const STEPS = [
    {
      icon: Fingerprint,
      title: 'Browser identity',
      text: 'The browser generates a Semaphore V4 identity and submits only the public commitment for authorization.',
      note: 'Secret stays local',
      noteTone: 'brut-tag-go',
    },
    {
      icon: Cpu,
      title: 'Groth16 prover',
      text: 'Computes a Groth16 proof and the scoped nullifier using WASM in the browser.',
      note: 'Real ZK proof, depth 16',
      noteTone: 'brut-tag-signal',
    },
    {
      icon: ServerCog,
      title: 'Server verifier',
      text: 'Checks the proof against the group Merkle root and enforces UNIQUE(scope_id, nullifier). Optionally re-verified by the Semaphore contract on-chain.',
      note: 'Cryptographically verified',
      noteTone: 'brut-tag-ink',
    },
    {
      icon: EyeOff,
      title: 'Privacy risk gate',
      text: 'Scans report text for direct identifiers and contextual dates or rooms, then classifies the status.',
      note: 'Auto redact / hold',
      noteTone: 'brut-tag-signal',
    },
    {
      icon: BarChart3,
      title: 'Threshold aggregator',
      text: 'Suppresses results when contributors are under 3 and shows category trends to recipients.',
      note: 'Min 3 members',
      noteTone: 'brut-tag-go',
    },
  ];

  const CONTROLS: { name: string; status: string; tone: 'ok' | 'warn' | 'opt'; detail: string }[] = [
    {
      name: 'Zero-knowledge proofs',
      status: 'Real Semaphore V4 (SnarkJS / Groth16)',
      tone: 'ok',
      detail: 'Groth16 proof generated on the client and verified server-side against the Merkle root.',
    },
    {
      name: 'Scoped duplicate prevention',
      status: 'Implemented (DB constraint)',
      tone: 'ok',
      detail: 'Enforced via a database unique key on (scope_id, nullifier).',
    },
    {
      name: 'Privacy risk gate',
      status: 'Implemented (regex and rules)',
      tone: 'ok',
      detail: 'Flags direct IDs, dates, rooms and serious allegations.',
    },
    {
      name: 'Threshold aggregation',
      status: 'Implemented (3+ members)',
      tone: 'ok',
      detail: 'Suppresses summary metrics under the minimum contributor count.',
    },
    {
      name: 'On-chain verification',
      status: 'Optional (CHAIN_ENABLED)',
      tone: 'opt',
      detail: 'When enabled, the Semaphore contract also verifies the proof and records the nullifier per topic. Report text never goes on-chain.',
    },
    {
      name: 'IP and network anonymity',
      status: 'Not covered (local transport)',
      tone: 'warn',
      detail: 'Residual risk: IP addresses need Tor onion routing or blind relay proxies.',
    },
  ];

  return (
    <div className="space-y-12 py-4">
      <PageHeader
        icon={Cpu}
        kicker="Under the hood"
        title="Security & architecture"
        description="Decoupling student identity from report content with Semaphore V4 membership proofs and privacy-risk classification."
      />

      {/* Dataflow */}
      <section className="space-y-5">
        <h2 className="flex items-center gap-3 font-display text-4xl uppercase tracking-wide sm:text-5xl">
          <Layers className="h-8 w-8" strokeWidth={2.5} />
          End-to-end dataflow
        </h2>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <article key={step.title} className="brut-card relative flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center border-[3px] border-ink bg-ink text-signal">
                    <Icon className="h-5 w-5" strokeWidth={2.75} />
                  </div>
                  <span className="font-display text-5xl leading-none opacity-30">{i + 1}</span>
                </div>
                <h3 className="font-display text-2xl uppercase leading-none tracking-wide">{step.title}</h3>
                <p className="flex-1 text-xs leading-relaxed text-steel">{step.text}</p>
                <span className={`brut-tag self-start ${step.noteTone}`}>{step.note}</span>
                {i < STEPS.length - 1 && (
                  <ArrowRight
                    className="absolute -right-[1.35rem] top-1/2 z-10 hidden h-6 w-6 -translate-y-1/2 xl:block"
                    strokeWidth={3.5}
                    aria-hidden="true"
                  />
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* Nullifier illustration */}
      <section className="brut-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-ink bg-ink px-5 py-3 text-paper">
          <h2 className="flex items-center gap-2 font-display text-3xl uppercase tracking-wide">
            <Key className="h-6 w-6 text-signal" strokeWidth={2.75} />
            Scoped nullifier sandbox
          </h2>
          <span className="brut-tag brut-tag-signal">Illustration only</span>
        </div>

        <div className="space-y-5 p-5">
          <p className="max-w-3xl text-sm leading-relaxed text-steel">
            This is a visual-only toy example to explain scope binding. The values below are NOT real Semaphore nullifiers,
            are not cryptographically secure, and do not provide unlinkability. Real nullifiers are generated by the
            Semaphore circuit and checked by the configured backend/contract.
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="sb-secret" className="brut-label">Member secret key</label>
              <input
                id="sb-secret"
                type="text"
                value={sandboxSecret}
                onChange={(e) => setSandboxSecret(e.target.value)}
                className="brut-field"
              />
            </div>
            <div>
              <label htmlFor="sb-a" className="brut-label">Scope A (teaching)</label>
              <input
                id="sb-a"
                type="text"
                value={sandboxScope}
                onChange={(e) => setSandboxScope(e.target.value)}
                className="brut-field"
              />
            </div>
            <div>
              <label htmlFor="sb-b" className="brut-label">Scope B (facilities)</label>
              <input
                id="sb-b"
                type="text"
                value={sandboxScopeB}
                onChange={(e) => setSandboxScopeB(e.target.value)}
                className="brut-field"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="brut-label !mb-0">Nullifier / {sandboxScope}</div>
              <div className="brut-code">{nullifierScopeA}</div>
            </div>
            <div className="space-y-2">
              <div className="brut-label !mb-0">Nullifier / {sandboxScopeB}</div>
              <div className="brut-code !bg-signal !text-ink">{nullifierScopeB}</div>
            </div>
          </div>

          <p className="text-xs text-steel">
            Illustration only: the displayed toy values do not establish privacy or unlinkability. Do not use these values for security decisions.
          </p>
        </div>
      </section>

      {/* Controls matrix */}
      <section className="brut-card">
        <div className="border-b-[3px] border-ink bg-ink px-5 py-3 text-paper">
          <h2 className="font-display text-3xl uppercase tracking-wide">Controls: built vs. not covered</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b-[3px] border-ink bg-signal font-mono text-[0.7rem] uppercase tracking-wider">
                <th scope="col" className="px-4 py-3">Control</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>
              {CONTROLS.map((row) => (
                <tr key={row.name} className="border-b-2 border-ink last:border-b-0">
                  <th scope="row" className="px-4 py-3 align-top font-bold">{row.name}</th>
                  <td className="px-4 py-3 align-top">
                    <span
                      className={`brut-tag ${
                        row.tone === 'ok' ? 'brut-tag-go' : row.tone === 'warn' ? 'brut-tag-alarm' : 'brut-tag-signal'
                      }`}
                    >
                      {row.tone === 'ok' && <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={3} />}
                      {row.tone === 'warn' && <AlertTriangle className="h-3.5 w-3.5" strokeWidth={3} />}
                      {row.tone === 'opt' && <Link2 className="h-3.5 w-3.5" strokeWidth={3} />}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top text-xs leading-relaxed text-steel">{row.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
