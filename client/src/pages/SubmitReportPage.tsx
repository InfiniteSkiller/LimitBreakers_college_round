import React, { useState, useEffect } from 'react';
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof } from '@semaphore-protocol/proof';
import { enrollIdentityCommitment, fetchGroupState, resolveTopic, submitReportPayload } from '../services/api';
import { PrivacyWarning } from '../components/PrivacyWarning';
import { PageHeader } from '../components/PageHeader';
import { ShieldCheck, Lock, AlertTriangle, CheckCircle2, Loader2, Send, EyeOff, ShieldAlert, KeyRound, UserCheck, Link2, RotateCcw, Fingerprint } from 'lucide-react';

const CATEGORIES = [
  { id: 'teaching', label: 'Teaching & Academics' },
  { id: 'facilities', label: 'Campus Facilities & Library' },
  { id: 'administration', label: 'College Administration' },
  { id: 'welfare', label: 'Student Welfare & Services' },
  { id: 'safety', label: 'Campus Safety & Environment' },
];

const PERIODS = ['2026-Q4', '2026-Q3', '2026-10'];

function hashToBigIntString(str: string): string {
  let hash = 0n;
  for (let i = 0; i < str.length; i++) {
    const char = BigInt(str.charCodeAt(i));
    hash = (hash * 31n + char) & 0xFFFFFFFFFFFFFFFFn;
  }
  return hash.toString();
}

export const SubmitReportPage: React.FC = () => {
  // Identity & Enrollment State
  const [studentTicket, setStudentTicket] = useState('STU-ALICE-101');
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Group State
  const [groupCommitments, setGroupCommitments] = useState<string[]>([]);
  const [groupRoot, setGroupRoot] = useState<string | null>(null);

  // Verification & Proof State
  const [category, setCategory] = useState('teaching');
  const [period, setPeriod] = useState('2026-Q4');
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [proofData, setProofData] = useState<any | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  // Form Content State
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    status: 'success' | 'duplicate' | 'held' | 'error';
    message: string;
    details?: any;
  } | null>(null);

  // Privacy Guard Pre-scan Flags
  const [detectedDraftFlags, setDetectedDraftFlags] = useState<string[]>([]);

  const currentScopeId = `${category}:${period}`;

  // Initialize or load identity from memory
  useEffect(() => {
    try {
      const savedSecret = localStorage.getItem('incognito_demo_identity_secret');
      if (savedSecret) {
        const id = new Identity(savedSecret);
        setIdentity(id);
      } else {
        const id = new Identity();
        localStorage.setItem('incognito_demo_identity_secret', id.export());
        setIdentity(id);
      }
    } catch (e) {
      const id = new Identity();
      setIdentity(id);
    }
  }, []);

  // Fetch current Semaphore group state on load & after enrollment
  const loadGroupState = async () => {
    try {
      const state = await fetchGroupState();
      setGroupCommitments(state.commitments);
      setGroupRoot(state.root);

      if (identity && state.commitments.includes(identity.commitment.toString())) {
        setIsEnrolled(true);
      } else {
        setIsEnrolled(false);
      }
    } catch (err) {
      console.error('Failed to load group state:', err);
    }
  };

  useEffect(() => {
    if (identity) {
      loadGroupState();
    }
  }, [identity]);

  // Live client-side privacy scan
  useEffect(() => {
    if (!content.trim()) {
      setDetectedDraftFlags([]);
      return;
    }
    const flags: string[] = [];
    if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content)) {
      flags.push('Email address detected');
    }
    if (/\b\d{3}[-.]?\d{4}\b|\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(content)) {
      flags.push('Phone number detected');
    }
    if (/\b(?:STU|ID|S|202[0-9])[-_]?\d{4,8}\b/.test(content)) {
      flags.push('Student ID number detected');
    }
    if (/\b(?:john doe|jane smith|dr. smith|prof. johnson)\b/i.test(content)) {
      flags.push('Specific personal name detected');
    }
    if (/\b(?:october \d+|room \d+|cs101)\b/i.test(content)) {
      flags.push('Specific date or classroom context');
    }
    setDetectedDraftFlags(flags);
  }, [content]);

  // Handle Generating New Local Identity
  const handleGenerateNewIdentity = () => {
    const newId = new Identity();
    localStorage.setItem('incognito_demo_identity_secret', newId.export());
    setIdentity(newId);
    setIsEnrolled(false);
    setProofData(null);
  };

  // Handle Enrollment Action
  const handleEnroll = async () => {
    if (!identity) return;
    setEnrollLoading(true);
    setEnrollError(null);

    try {
      const commitmentStr = identity.commitment.toString();
      await enrollIdentityCommitment(studentTicket, commitmentStr);
      await loadGroupState();
      setIsEnrolled(true);
    } catch (err: any) {
      setEnrollError(err.message || 'Enrollment failed');
    } finally {
      setEnrollLoading(false);
    }
  };

  // Handle ZK Proof Generation
  const handleGenerateProof = async () => {
    if (!identity) {
      setProofError('No local Semaphore identity found.');
      return;
    }
    if (!content.trim() || content.length < 5) {
      setProofError('Please enter report content (min 5 characters) before generating proof.');
      return;
    }

    setIsGeneratingProof(true);
    setProofError(null);
    setSubmissionResult(null);

    try {
      // 1. Fetch latest group state
      const state = await fetchGroupState();
      if (!state.commitments.includes(identity.commitment.toString())) {
        setIsEnrolled(false);
        throw new Error('Your identity commitment is not enrolled in the server Semaphore group. Please enroll first.');
      }

      // 2. Reconstruct group
      const group = new Group(state.commitments);

      const messageBigIntStr = hashToBigIntString(content);
      // The backend tells us which scope to prove against: the on-chain topic ID
      // (so the contract accepts the proof) or, off-chain, the hashed scope.
      const topic = await resolveTopic(currentScopeId);
      const scopeBigIntStr = topic.proofScope;

      // 3. Generate real Semaphore v4 ZK Proof
      const proof = await generateProof(
        identity,
        group,
        messageBigIntStr,
        scopeBigIntStr,
        16,
        {
          wasm: '/snark-artifacts/semaphore.wasm',
          zkey: '/snark-artifacts/semaphore_16.zkey',
        }
      );

      setProofData(proof);
    } catch (err: any) {
      setProofError(err.message || 'Failed to generate Semaphore proof');
      setProofData(null);
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Handle Report Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofData) {
      setProofError('Please generate a valid Semaphore ZK proof first.');
      return;
    }
    if (!content.trim() || content.length < 5) {
      alert('Report content must be at least 5 characters long.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionResult(null);

    try {
      const res = await submitReportPayload({
        category,
        scopeId: currentScopeId,
        content,
        proof: proofData,
      });

      if (res.statusCode === 409) {
        setSubmissionResult({
          status: 'duplicate',
          message: res.error || 'Duplicate Submission Rejected: Scoped nullifier already exists in database.',
          details: res,
        });
      } else if (res.id) {
        if (res.status === 'approved_for_aggregation') {
          setSubmissionResult({
            status: 'success',
            message: 'Report accepted and queued for aggregated feedback summary!',
            details: res,
          });
        } else {
          setSubmissionResult({
            status: 'held',
            message: 'Report submitted and held for privacy sanitization review before aggregation.',
            details: res,
          });
        }
        setContent('');
        setProofData(null);
      } else {
        setSubmissionResult({
          status: 'error',
          message: res.error || 'Submission failed',
        });
      }
    } catch (err: any) {
      setSubmissionResult({
        status: 'error',
        message: err.message || 'Failed to submit report',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-4">
      <PageHeader
        icon={Lock}
        kicker="Anonymous submission"
        title="File a report"
        description="Your identity secret is created in this browser and never leaves it. The server only receives a Semaphore V4 zero-knowledge proof that you are a member, plus the report text."
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-8 lg:col-span-2">
          {/* STEP 1: identity + enrollment */}
          <section className="brut-card">
            <StepHeader
              n={1}
              title="Membership enrollment"
              right={
                <span className={`brut-tag ${isEnrolled ? 'brut-tag-go' : 'brut-tag-signal'}`}>
                  {isEnrolled ? 'Enrolled & verified' : 'Action needed'}
                </span>
              }
            />

            <div className="space-y-4 p-5">
              <p className="text-sm leading-relaxed text-steel">
                A secret Semaphore identity is generated locally. Only its public commitment is sent for college enrollment.
              </p>

              {identity && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="brut-label !mb-0 flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" strokeWidth={2.75} />
                      Public identity commitment
                    </span>
                    <button type="button" onClick={handleGenerateNewIdentity} className="brut-btn brut-btn-paper brut-btn-sm">
                      <RotateCcw className="h-3 w-3" strokeWidth={3} />
                      <span>Reset identity</span>
                    </button>
                  </div>
                  <div className="brut-code select-all">{identity.commitment.toString()}</div>
                </div>
              )}

              {!isEnrolled ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="student-ticket" className="brut-label">Demo student ID / ticket</label>
                    <input
                      id="student-ticket"
                      type="text"
                      value={studentTicket}
                      onChange={(e) => setStudentTicket(e.target.value)}
                      className="brut-field"
                      placeholder="e.g. STU-ALICE-101"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={enrollLoading}
                    className="brut-btn w-full py-3"
                  >
                    {enrollLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} />
                        <span>Authorizing commitment...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4" strokeWidth={2.75} />
                        <span>Enroll commitment into the group</span>
                      </>
                    )}
                  </button>

                  {enrollError && (
                    <div role="alert" className="flex items-start gap-2 border-[3px] border-ink bg-alarm p-3 text-xs font-bold">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.75} />
                      <span>{enrollError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 border-[3px] border-ink bg-go p-3 text-xs font-bold">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" strokeWidth={3} />
                  <span>Commitment is enrolled in the trusted Semaphore group ({groupCommitments.length} total members).</span>
                </div>
              )}
            </div>
          </section>

          {/* STEP 2-4: report form */}
          <form onSubmit={handleSubmit} className="brut-card">
            <StepHeader n={2} title="Report and scope" />

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className="brut-label">Reporting category</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setProofData(null);
                    }}
                    className="brut-field"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="period" className="brut-label">Reporting period</label>
                  <select
                    id="period"
                    value={period}
                    onChange={(e) => {
                      setPeriod(e.target.value);
                      setProofData(null);
                    }}
                    className="brut-field"
                  >
                    {PERIODS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="report-content" className="brut-label">Feedback / report content</label>
                <textarea
                  id="report-content"
                  rows={6}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setProofData(null);
                  }}
                  className="brut-field resize-y font-sans text-sm"
                  placeholder="Describe your feedback, concern or recommendation. Do not include your name, student ID or personal email."
                />
              </div>

              {/* Pre-scan warning */}
              {detectedDraftFlags.length > 0 && (
                <div role="alert" className="border-[3px] border-ink bg-signal">
                  <div className="flex items-center gap-2 border-b-[3px] border-ink bg-ink px-3 py-2 text-signal">
                    <AlertTriangle className="h-4 w-4" strokeWidth={2.75} />
                    <span className="font-display text-xl uppercase tracking-wide">Privacy guard pre-scan</span>
                  </div>
                  <div className="space-y-2 p-3">
                    <p className="text-xs font-medium">Possible identifying details found in your draft:</p>
                    <div className="flex flex-wrap gap-2">
                      {detectedDraftFlags.map((flag, idx) => (
                        <span key={idx} className="brut-tag">
                          <AlertTriangle className="h-3 w-3" strokeWidth={3} />
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: proof */}
              <div className="space-y-3 border-t-[3px] border-dashed border-ink pt-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center border-[3px] border-ink bg-signal font-display text-xl">3</span>
                  <span className="font-display text-2xl uppercase tracking-wide">Zero-knowledge proof</span>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateProof}
                  disabled={isGeneratingProof || !isEnrolled || !content.trim()}
                  className="brut-btn brut-btn-ink w-full py-3.5"
                >
                  {isGeneratingProof ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={3} />
                      <span>Generating Groth16 proof...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" strokeWidth={2.75} />
                      <span>Generate membership proof</span>
                    </>
                  )}
                </button>

                {proofError && (
                  <div role="alert" className="flex items-start gap-2 border-[3px] border-ink bg-alarm p-3 text-xs font-bold">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.75} />
                    <span>{proofError}</span>
                  </div>
                )}

                {proofData && (
                  <div className="border-[3px] border-ink bg-card">
                    <div className="flex items-center justify-between gap-2 border-b-[3px] border-ink bg-go px-3 py-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                        Proof generated
                      </span>
                      <span className="font-mono text-[0.68rem] font-bold">Depth {proofData.merkleTreeDepth}</span>
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="brut-label !mb-1 flex items-center gap-1.5">
                        <Fingerprint className="h-3.5 w-3.5" strokeWidth={2.75} />
                        Scope nullifier
                      </div>
                      <div className="brut-code select-all">{proofData.nullifier}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 4: submit */}
              <div className="space-y-3 border-t-[3px] border-dashed border-ink pt-5">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center border-[3px] border-ink bg-signal font-display text-xl">4</span>
                  <span className="font-display text-2xl uppercase tracking-wide">Send it</span>
                </div>
                <button type="submit" disabled={isSubmitting || !proofData} className="brut-btn brut-btn-xl w-full">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" strokeWidth={3} />
                      <span>Verifying proof...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-6 w-6" strokeWidth={2.75} />
                      <span>Submit anonymous report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Submission result */}
          {submissionResult && (
            <div
              role="status"
              aria-live="polite"
              className={`border-[3px] border-ink shadow-hard ${
                submissionResult.status === 'held' ? 'bg-paper' : 'bg-card'
              }`}
            >
              <div
                className={`flex items-center gap-3 border-b-[3px] border-ink px-4 py-3 ${
                  submissionResult.status === 'success'
                    ? 'bg-go'
                    : submissionResult.status === 'duplicate'
                      ? 'bg-signal'
                      : submissionResult.status === 'held'
                        ? 'bg-ink text-paper'
                        : 'bg-alarm'
                }`}
              >
                {submissionResult.status === 'success' && <CheckCircle2 className="h-6 w-6" strokeWidth={3} />}
                {submissionResult.status === 'duplicate' && <ShieldAlert className="h-6 w-6" strokeWidth={3} />}
                {submissionResult.status === 'held' && <EyeOff className="h-6 w-6" strokeWidth={3} />}
                {submissionResult.status === 'error' && <AlertTriangle className="h-6 w-6" strokeWidth={3} />}
                <span className="font-display text-3xl uppercase tracking-wide">
                  {submissionResult.status === 'success' && 'Report submitted (HTTP 201)'}
                  {submissionResult.status === 'duplicate' && 'Duplicate blocked (HTTP 409)'}
                  {submissionResult.status === 'held' && 'Held for privacy review'}
                  {submissionResult.status === 'error' && 'Submission error'}
                </span>
              </div>

              <div className="space-y-3 p-4">
                <p className="text-sm leading-relaxed">{submissionResult.message}</p>
                {submissionResult.details?.txHash && (
                  <div className="flex items-start gap-2 border-[3px] border-ink bg-ink p-3 font-mono text-[0.7rem] text-signal">
                    <Link2 className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.75} />
                    <span className="break-all">
                      Verified on-chain (topic #{submissionResult.details.topicId}) / tx {submissionResult.details.txHash}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <PrivacyWarning />

          <aside className="brut-card-ink space-y-3 p-5 text-xs !shadow-hard">
            <h2 className="flex items-center gap-2 font-display text-2xl uppercase tracking-wide text-signal">
              <Lock className="h-5 w-5" strokeWidth={2.75} />
              How the proof works
            </h2>
            <p className="leading-relaxed text-paper/85">
              Your browser proves membership in the college group without revealing which member you are.
            </p>
            <p className="leading-relaxed text-paper/85">
              The scope nullifier <code className="bg-signal px-1 font-mono text-ink">H(Identity, Scope)</code> blocks
              duplicate submissions per scope while keeping your reports unlinkable across scopes.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
};

const StepHeader: React.FC<{ n: number; title: string; right?: React.ReactNode }> = ({ n, title, right }) => (
  <div className="flex items-stretch border-b-[3px] border-ink">
    <div className="flex w-14 flex-shrink-0 items-center justify-center border-r-[3px] border-ink bg-signal font-display text-4xl">
      {n}
    </div>
    <div className="flex flex-1 flex-wrap items-center justify-between gap-2 bg-ink px-4 py-3 text-paper">
      <h2 className="font-display text-3xl uppercase tracking-wide">{title}</h2>
      {right}
    </div>
  </div>
);
