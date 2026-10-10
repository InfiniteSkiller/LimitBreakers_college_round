import React, { useState, useEffect } from 'react';
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof } from '@semaphore-protocol/proof';
import { enrollIdentityCommitment, fetchGroupState, submitReportPayload, resolveTopicId } from '../services/api';
import { PrivacyWarning } from '../components/PrivacyWarning';
import { ShieldCheck, Lock, AlertTriangle, CheckCircle2, RefreshCw, Send, EyeOff, ShieldAlert, KeyRound, UserCheck, ArrowRight } from 'lucide-react';
import { UserRole } from '../components/Navbar';

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

interface SubmitReportPageProps {
  initialStudentTicket?: string | null;
  userRole?: UserRole;
  onOpenLogin?: (role?: 'student' | 'admin') => void;
  onNavigateModerator?: () => void;
}

export const SubmitReportPage: React.FC<SubmitReportPageProps> = ({
  initialStudentTicket,
  userRole,
  onOpenLogin,
  onNavigateModerator,
}) => {
  // Identity & Enrollment State
  const [studentTicket, setStudentTicket] = useState(
    initialStudentTicket || localStorage.getItem('incognito_student_ticket') || 'STU-ALICE-101'
  );
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Sync ticket if prop changes
  useEffect(() => {
    if (initialStudentTicket) {
      setStudentTicket(initialStudentTicket);
    }
  }, [initialStudentTicket]);

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

      // 3. Resolve numeric topic ID from the server (aligns with on-chain topicId)
      const { topicId } = await resolveTopicId(category, period);

      const messageBigIntStr = hashToBigIntString(content);

      // 4. Generate real Semaphore v4 ZK Proof with numeric topicId as scope
      const proof = await generateProof(
        identity,
        group,
        messageBigIntStr,
        topicId,        // numeric scope — matches contract's proof.scope == topicId
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

  // Block Administrators from Submitting Reports
  if (userRole === 'admin') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="glass-card p-8 sm:p-10 rounded-3xl border border-amber-500/40 text-center space-y-6 shadow-2xl relative overflow-hidden bg-slate-950/80">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono">
              <span>Staff Role: Administrator Mode Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Administrators Cannot Submit Complaints
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xl mx-auto">
              To strictly preserve institutional integrity, prevent conflicts of interest, and protect students from administrative bias, feedback submissions are reserved exclusively for verified student identities.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-2 max-w-lg mx-auto">
            <div className="font-semibold text-slate-200 flex items-center space-x-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Institutional Trust Boundary</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Administrators hold moderation rights to sanitize reports and approve aggregations. Allowing administrators to submit anonymous reports could poison aggregate sentiment metrics or compromise student trust.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            {onNavigateModerator && (
              <button
                onClick={onNavigateModerator}
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all shadow-lg shadow-amber-600/20 flex items-center space-x-2"
              >
                <span>Go to Moderator Queue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {onOpenLogin && (
              <button
                onClick={() => onOpenLogin('student')}
                className="glass-panel hover:bg-slate-800/80 text-teal-300 font-semibold text-xs px-5 py-3 rounded-xl transition-all border border-teal-500/30 flex items-center space-x-2"
              >
                <span>Switch to Student Account</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Anonymous Report Submission</h1>
            <p className="text-slate-400 text-xs">
              Real Zero-Knowledge Cryptographic Proofs (Semaphore Protocol V4). Zero identity linkage. Scope-bound nullifier protection.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Section (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Local Identity & Enrollment */}
          <div className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-white font-semibold text-sm">
                <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs">1</span>
                <span>Membership Enrollment (Semaphore V4)</span>
              </div>
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${isEnrolled ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}>
                {isEnrolled ? 'Enrolled & Verified' : 'Action Needed'}
              </span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              Generates a secret Semaphore identity locally in your browser. Only your public commitment is sent for college enrollment authorization.
            </p>

            {identity && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium flex items-center space-x-1">
                    <KeyRound className="w-3.5 h-3.5 text-violet-400" />
                    <span>Browser Identity Commitment (Public):</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateNewIdentity}
                    className="text-violet-400 hover:text-violet-300 text-[10px] underline"
                  >
                    Reset Identity
                  </button>
                </div>
                <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-violet-300 break-all select-all border border-slate-800">
                  {identity.commitment.toString()}
                </div>
              </div>
            )}

            {!isEnrolled ? (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-slate-300 text-xs font-medium mb-1">Demo Student ID / Ticket</label>
                  <input
                    type="text"
                    value={studentTicket}
                    onChange={(e) => setStudentTicket(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg glass-input text-xs font-mono"
                    placeholder="e.g. STU-ALICE-101"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleEnroll}
                  disabled={enrollLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs transition-all flex items-center justify-center space-x-2"
                >
                  {enrollLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Authorizing Commitment...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      <span>Enroll Commitment into Semaphore Group</span>
                    </>
                  )}
                </button>

                {enrollError && (
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{enrollError}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Identity Commitment is enrolled in the trusted Semaphore group ({groupCommitments.length} total members).</span>
              </div>
            )}
          </div>

          {/* STEP 2: Report Content & Scope Selection */}
          <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 text-white font-semibold text-sm">
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs">2</span>
              <span>Anonymous Report & Scope Selection</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1">Reporting Category</label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setProofData(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg glass-input text-xs"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-slate-900 text-slate-200">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-medium mb-1">Reporting Period</label>
                <select
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setProofData(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg glass-input text-xs"
                >
                  {PERIODS.map((p) => (
                    <option key={p} value={p} className="bg-slate-900 text-slate-200">
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1">Feedback / Report Content</label>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setProofData(null);
                }}
                className="w-full p-3 rounded-xl glass-input text-xs font-sans leading-relaxed"
                placeholder="Describe your feedback, concern, or recommendation clearly. Do not include your name, student ID, or personal emails..."
              />
            </div>

            {/* Privacy Pre-Scan Warning */}
            {detectedDraftFlags.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs space-y-1">
                <div className="flex items-center space-x-2 font-semibold text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Privacy Guard Pre-Scan Warning</span>
                </div>
                <p className="text-[11px] text-amber-200/90">
                  Detected potential identifying detail(s) in draft text:
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {detectedDraftFlags.map((flag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                      ⚠️ {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: ZK Proof Generation */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleGenerateProof}
                disabled={isGeneratingProof || !isEnrolled || !content.trim()}
                className={`w-full py-3 px-4 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center space-x-2 ${!isEnrolled || !content.trim()
                    ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed'
                    : 'bg-violet-600/30 hover:bg-violet-600/40 text-violet-200 border-violet-500/40'
                  }`}
              >
                {isGeneratingProof ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-violet-400" />
                    <span>Generating Real Groth16 ZK Proof (SnarkJS)...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                    <span>Generate Semaphore V4 ZK Membership Proof</span>
                  </>
                )}
              </button>

              {proofError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{proofError}</span>
                </div>
              )}

              {proofData && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-emerald-400 font-semibold">
                    <span className="flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Groth16 ZK Proof Generated Successfully</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Depth: {proofData.merkleTreeDepth}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400">Scope Nullifier:</div>
                    <div className="p-2 rounded bg-slate-950 font-mono text-[10px] text-teal-300 break-all select-all border border-slate-800">
                      {proofData.nullifier}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 4: Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !proofData}
              className={`w-full py-3.5 px-6 rounded-xl text-white font-semibold text-sm transition-all shadow-lg flex items-center justify-center space-x-2 ${!proofData
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-violet-600 to-teal-500 hover:from-violet-500 hover:to-teal-400 shadow-violet-600/20'
                }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Proof On Server...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Anonymous Report</span>
                </>
              )}
            </button>
          </form>

          {/* Submission Result */}
          {submissionResult && (
            <div className={`p-6 rounded-2xl border ${submissionResult.status === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : submissionResult.status === 'duplicate'
                  ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  : submissionResult.status === 'held'
                    ? 'bg-violet-950/40 border-violet-500/40 text-violet-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              } space-y-3`}>
              <div className="flex items-center space-x-2 text-base font-bold">
                {submissionResult.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                {submissionResult.status === 'duplicate' && <ShieldAlert className="w-5 h-5 text-amber-400" />}
                {submissionResult.status === 'held' && <EyeOff className="w-5 h-5 text-violet-400" />}
                {submissionResult.status === 'error' && <AlertTriangle className="w-5 h-5 text-rose-400" />}
                <span>
                  {submissionResult.status === 'success' && 'Report Successfully Submitted (HTTP 201)'}
                  {submissionResult.status === 'duplicate' && 'Duplicate Submission Blocked (HTTP 409 Conflict)'}
                  {submissionResult.status === 'held' && 'Report Held for Privacy Sanitization Review'}
                  {submissionResult.status === 'error' && 'Submission Error'}
                </span>
              </div>

              <p className="text-xs leading-relaxed">{submissionResult.message}</p>
            </div>
          )}
        </div>

        {/* Sidebar (1 col) */}
        <div className="space-y-6">
          <PrivacyWarning />

          <div className="glass-card p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <h3 className="font-semibold text-white text-sm flex items-center space-x-1.5">
              <Lock className="w-4 h-4 text-teal-400" />
              <span>Semaphore Cryptographic Proofs</span>
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Your browser generates a zero-knowledge proof proving membership in the college group without revealing your identity.
            </p>
            <p className="text-slate-400 leading-relaxed">
              The scope nullifier <code className="text-violet-300">H(Identity, Scope)</code> prevents duplicate submissions per scope while keeping your identity unlinkable across different scopes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
