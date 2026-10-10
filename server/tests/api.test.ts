import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/database.js';
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof } from '@semaphore-protocol/proof';
import { EnrollmentService } from '../src/services/enrollmentService.js';
import { TopicRegistryService } from '../src/services/topicRegistry.js';
import { hashToBigIntString } from '../src/services/verifier.js';
import { PrivacyRiskGate } from '../src/services/privacyGate.js';

describe('Incognito Anonymous Feedback Platform - Real Semaphore V4 Test Suite', () => {
  let app: ReturnType<typeof buildApp>;
  let db: ReturnType<typeof createDatabase>;
  let enrollmentService: EnrollmentService;
  let topicRegistry: TopicRegistryService;

  beforeEach(() => {
    // Fresh in-memory SQLite database for every test
    db = createDatabase(':memory:');
    app = buildApp(db);
    enrollmentService = new EnrollmentService(db);
    topicRegistry = new TopicRegistryService(db);
  });

  /**
   * Helper: resolve a numeric topic ID for a scope (creates topic if needed).
   */
  function resolveTopicId(category: string, period: string): number {
    return topicRegistry.getOrCreateTopic(category, period);
  }

  // Test 1: Real enrolled Semaphore identity generates valid proof and is accepted
  it('1. should accept valid Semaphore V4 membership proof from enrolled identity', async () => {
    // 1. Create & enroll identity
    const identity = new Identity();
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-2026-8812',
        identityCommitment: identity.commitment.toString(),
      },
    });

    // 2. Fetch group state & build group
    const groupRes = await app.inject({ method: 'GET', url: '/api/group/state' });
    const { commitments } = groupRes.json();
    const group = new Group(commitments);

    const category = 'teaching';
    const period = '2026-Q4';
    const scopeId = `${category}:${period}`;
    const content = 'Constructive feedback regarding course textbook availability.';

    // 3. Resolve numeric topic ID (used as proof scope — aligns with on-chain topicId)
    const topicId = resolveTopicId(category, period);

    // 4. Generate real Semaphore proof with numeric topicId as scope
    const proof = await generateProof(
      identity,
      group,
      hashToBigIntString(content),
      topicId,
      16
    );

    // 5. Submit report
    const response = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category,
        scopeId,
        content,
        proof,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.id).toBeDefined();
    expect(body.status).toBe('approved_for_aggregation');
  });

  // Test 2: Non-member identity proof is rejected (Merkle root mismatch or invalid leaf)
  it('2. should reject membership proof from an unenrolled identity (untrusted root / non-member)', async () => {
    // Enroll member A in group
    const memberA = new Identity();
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-MEMBER-A',
        identityCommitment: memberA.commitment.toString(),
      },
    });

    // Non-member B creates a proof using their own identity and a fake local group
    const nonMemberB = new Identity();
    const fakeGroup = new Group([nonMemberB.commitment.toString()]);
    const topicId = resolveTopicId('teaching', '2026-Q4');
    const content = 'Unauthorized report from unenrolled user.';

    const proof = await generateProof(
      nonMemberB,
      fakeGroup,
      hashToBigIntString(content),
      topicId,
      16
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'teaching',
        scopeId: 'teaching:2026-Q4',
        content,
        proof,
      },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error).toContain('Untrusted or Stale Merkle Root');
  });

  // Test 3: Altered proof points are rejected
  it('3. should reject an altered proof payload (cryptographic verification failure)', async () => {
    const identity = new Identity();
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-MEMBER-ALTER',
        identityCommitment: identity.commitment.toString(),
      },
    });

    const groupRes = await app.inject({ method: 'GET', url: '/api/group/state' });
    const group = new Group(groupRes.json().commitments);

    const topicId = resolveTopicId('teaching', '2026-Q4');
    const content = 'Report content for alter proof test.';
    const proof = await generateProof(
      identity,
      group,
      hashToBigIntString(content),
      topicId,
      16
    );

    // Tamper with proof points
    const tamperedProof = {
      ...proof,
      points: [
        '9999999999999999999999999999999999999999',
        ...proof.points.slice(1),
      ],
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'teaching',
        scopeId: 'teaching:2026-Q4',
        content,
        proof: tamperedProof,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toContain('Membership verification failed');
  });

  // Test 4: Proof submitted with modified content / message is rejected
  it('4. should reject proof if report content does not match proof message binding', async () => {
    const identity = new Identity();
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-MEMBER-MSG-BIND',
        identityCommitment: identity.commitment.toString(),
      },
    });

    const groupRes = await app.inject({ method: 'GET', url: '/api/group/state' });
    const group = new Group(groupRes.json().commitments);

    const originalContent = 'Original feedback content text.';
    const tamperedContent = 'Tampered feedback content text altered after proof generation.';

    const topicId = resolveTopicId('teaching', '2026-Q4');

    // Generate proof bound to originalContent
    const proof = await generateProof(
      identity,
      group,
      hashToBigIntString(originalContent),
      topicId,
      16
    );

    // Submit with tamperedContent
    const response = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'teaching',
        scopeId: 'teaching:2026-Q4',
        content: tamperedContent,
        proof,
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().error).toContain('Membership verification failed');
  });

  // Test 5: Rejection of duplicate nullifier within the same scope
  it('5. should reject duplicate submission within the same scope (409 Conflict)', async () => {
    const identity = new Identity();
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-DUPLICATE-USER',
        identityCommitment: identity.commitment.toString(),
      },
    });

    const groupRes = await app.inject({ method: 'GET', url: '/api/group/state' });
    const group = new Group(groupRes.json().commitments);

    const topicId = resolveTopicId('teaching', '2026-Q4');
    const scopeId = 'teaching:2026-Q4';
    const content1 = 'First valid anonymous submission regarding assignment deadlines.';
    const proof1 = await generateProof(
      identity,
      group,
      hashToBigIntString(content1),
      topicId,
      16
    );

    // First submission
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'teaching',
        scopeId,
        content: content1,
        proof: proof1,
      },
    });
    expect(res1.statusCode).toBe(201);

    // Second submission by same identity in SAME scope produces exact same nullifier
    const content2 = 'Second submission attempting duplicate vote within same scope.';
    const proof2 = await generateProof(
      identity,
      group,
      hashToBigIntString(content2),
      topicId,
      16
    );

    expect(proof1.nullifier).toBe(proof2.nullifier);

    const res2 = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'teaching',
        scopeId,
        content: content2,
        proof: proof2,
      },
    });

    expect(res2.statusCode).toBe(409);
    expect(res2.json().error).toContain('Duplicate Submission Rejected');
  });

  // Test 6: Same identity can submit in a DIFFERENT permitted scope
  it('6. should accept submission from same user in a DIFFERENT scope with unlinkable nullifiers', async () => {
    const identity = new Identity();
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-MULTI-SCOPE-USER',
        identityCommitment: identity.commitment.toString(),
      },
    });

    const groupRes = await app.inject({ method: 'GET', url: '/api/group/state' });
    const group = new Group(groupRes.json().commitments);

    const topicIdA = resolveTopicId('teaching', '2026-Q4');
    const topicIdB = resolveTopicId('facilities', '2026-Q4');
    const scopeA = 'teaching:2026-Q4';
    const scopeB = 'facilities:2026-Q4';

    const contentA = 'Feedback for teaching scope.';
    const contentB = 'Feedback for facilities scope.';

    const proofA = await generateProof(
      identity,
      group,
      hashToBigIntString(contentA),
      topicIdA,
      16
    );
    const proofB = await generateProof(
      identity,
      group,
      hashToBigIntString(contentB),
      topicIdB,
      16
    );

    // Scope A nullifier and Scope B nullifier must be cryptographically distinct (unlinkable)
    expect(proofA.nullifier).not.toBe(proofB.nullifier);

    // Submit Scope A
    const resA = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: { category: 'teaching', scopeId: scopeA, content: contentA, proof: proofA },
    });
    expect(resA.statusCode).toBe(201);

    // Submit Scope B
    const resB = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: { category: 'facilities', scopeId: scopeB, content: contentB, proof: proofB },
    });
    expect(resB.statusCode).toBe(201);
  });

  // Test 7: Concurrent duplicate submissions cannot both succeed
  it('7. should handle concurrent duplicate submissions and ensure DB unique constraint blocks duplicate', async () => {
    const identity = new Identity();
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-CONCURRENT-USER',
        identityCommitment: identity.commitment.toString(),
      },
    });

    const groupRes = await app.inject({ method: 'GET', url: '/api/group/state' });
    const group = new Group(groupRes.json().commitments);

    const topicId = resolveTopicId('safety', '2026-Q4');
    const scopeId = 'safety:2026-Q4';
    const content = 'Concurrent submission test regarding hallway lighting.';
    const proof = await generateProof(
      identity,
      group,
      hashToBigIntString(content),
      topicId,
      16
    );

    const submitFn = () => app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: { category: 'safety', scopeId, content, proof },
    });

    const [res1, res2] = await Promise.all([submitFn(), submitFn()]);
    const statusCodes = [res1.statusCode, res2.statusCode].sort();

    expect(statusCodes).toEqual([201, 409]);
  });

  // Test 8: Privacy Risk Gate detects direct personal information
  it('8. should detect direct personal information (email, phone, student ID) and flag for sanitization', async () => {
    const directInfoContent = 'Please follow up with john.doe@college.edu or call 555-0199 regarding my student ID STU-2026-7788.';
    const analysis = PrivacyRiskGate.analyzeReport(directInfoContent);

    expect(analysis.status).toBe('needs_sanitization');
    expect(analysis.privacyFlags).toContain('DIRECT_IDENTIFIER:EMAIL');
    expect(analysis.privacyFlags).toContain('DIRECT_IDENTIFIER:PHONE');
    expect(analysis.privacyFlags).toContain('DIRECT_IDENTIFIER:STUDENT_ID');
    expect(analysis.sanitizedContent).toContain('[REDACTED EMAIL]');
    expect(analysis.sanitizedContent).toContain('[REDACTED PHONE]');
    expect(analysis.sanitizedContent).toContain('[REDACTED STUDENT ID]');
  });

  // Test 9: Holding potentially identifying reports
  it('9. should hold potentially identifying reports (dates, locations, course codes) for manual review', async () => {
    const contextualContent = 'On October 12th at 3:15pm in Room 402, an issue occurred during CS101 lecture.';
    const analysis = PrivacyRiskGate.analyzeReport(contextualContent);

    expect(analysis.status).toBe('held_for_privacy_review');
    expect(analysis.privacyFlags).toContain('CONTEXTUAL_RISK:SPECIFIC_DATE');
    expect(analysis.privacyFlags).toContain('CONTEXTUAL_RISK:SPECIFIC_LOCATION');
    expect(analysis.privacyFlags).toContain('CONTEXTUAL_RISK:COURSE_CODE');
  });

  // Test 10: Unauthorized moderator access
  it('10. should enforce authentication on moderator admin endpoints (401/403)', async () => {
    const resNoAuth = await app.inject({ method: 'GET', url: '/api/admin/reports' });
    expect(resNoAuth.statusCode).toBe(401);

    const resBadAuth = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
      headers: { authorization: 'Bearer invalid-token-xyz' },
    });
    expect(resBadAuth.statusCode).toBe(403);

    const resValidAuth = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
      headers: { authorization: 'Bearer moderator-secret-token-2026' },
    });
    expect(resValidAuth.statusCode).toBe(200);
  });

  // Test 11: Ensuring report output NEVER contains student identity or identity commitment
  it('11. should ensure reports DB and endpoints NEVER leak student tickets, identity secrets, or commitments', async () => {
    const identity = new Identity();
    const studentTicket = 'STU-SECRET-IDENTITY-999';
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: { studentTicket, identityCommitment: identity.commitment.toString() },
    });

    const groupRes = await app.inject({ method: 'GET', url: '/api/group/state' });
    const group = new Group(groupRes.json().commitments);

    const topicId = resolveTopicId('welfare', '2026-Q4');
    const scopeId = 'welfare:2026-Q4';
    const content = 'Student welfare counseling hours should be extended on weekends.';
    const proof = await generateProof(
      identity,
      group,
      hashToBigIntString(content),
      topicId,
      16
    );

    await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: { category: 'welfare', scopeId, content, proof },
    });

    // Check admin reports response payload
    const adminRes = await app.inject({
      method: 'GET',
      url: '/api/admin/reports',
      headers: { authorization: 'Bearer moderator-secret-token-2026' },
    });
    const adminStr = adminRes.payload;

    expect(adminStr).not.toContain(studentTicket);
    expect(adminStr).not.toContain(identity.commitment.toString());
  });

  // Test 12: Topics API — resolve returns correct numeric ID and scopes are deterministic
  it('12. should resolve category+period to a deterministic numeric topicId via the topics API', async () => {
    // First resolve creates the topic
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/topics/resolve?category=teaching&period=2026-Q4',
    });
    expect(res1.statusCode).toBe(200);
    const body1 = res1.json();
    expect(body1.topicId).toBe(1);
    expect(body1.scopeId).toBe('teaching:2026-Q4');

    // Second call returns the same ID (idempotent)
    const res2 = await app.inject({
      method: 'GET',
      url: '/api/topics/resolve?category=teaching&period=2026-Q4',
    });
    expect(res2.json().topicId).toBe(1);

    // Different scope gets a different ID
    const res3 = await app.inject({
      method: 'GET',
      url: '/api/topics/resolve?category=facilities&period=2026-Q4',
    });
    expect(res3.json().topicId).toBe(2);
  });

  // Test 13: Full scope alignment — proof scope matches numeric topic ID
  it('13. should verify that proof scope matches the numeric topicId used by the contract', async () => {
    const identity = new Identity();
    await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-SCOPE-ALIGN',
        identityCommitment: identity.commitment.toString(),
      },
    });

    const groupRes = await app.inject({ method: 'GET', url: '/api/group/state' });
    const group = new Group(groupRes.json().commitments);

    const topicId = resolveTopicId('administration', '2026-Q4');
    const content = 'Admin office hours need to be more accessible.';

    const proof = await generateProof(
      identity,
      group,
      hashToBigIntString(content),
      topicId,
      16
    );

    // Verify proof.scope equals the numeric topic ID
    expect(String(proof.scope)).toBe(String(topicId));

    // Submit should succeed
    const response = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'administration',
        scopeId: 'administration:2026-Q4',
        content,
        proof,
      },
    });

    expect(response.statusCode).toBe(201);
  });
});
