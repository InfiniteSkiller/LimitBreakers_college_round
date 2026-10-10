import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/database.js';
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof } from '@semaphore-protocol/proof';
import { BlockchainService } from '../src/services/blockchainService.js';
import { hashToBigIntString } from '../src/services/verifier.js';
import type { Hash } from 'viem';

describe('Incognito End-to-End Blockchain Integration Tests', () => {
  let db: ReturnType<typeof createDatabase>;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  it('should successfully submit report on-chain and record confirmed status and txHash', async () => {
    // 1. Create a mock blockchain service that simulates a live chain
    const submittedOnChain: Array<{ topicId: number; proof: any }> = [];
    const addedMembers: string[] = [];

    const mockBlockchain = new BlockchainService();
    // Simulate configured state
    Object.defineProperty(mockBlockchain, 'isConfigured', { get: () => true });
    mockBlockchain.submitProofOnChain = async (topicId: number, proof: any) => {
      submittedOnChain.push({ topicId, proof });
      return { txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hash, success: true };
    };
    mockBlockchain.addMemberOnChain = async (commitment: string) => {
      addedMembers.push(commitment);
      return { txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash, success: true };
    };

    const app = buildApp(db, mockBlockchain);

    // 2. Enroll student identity
    const identity = new Identity();
    const enrollRes = await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-CHAIN-101',
        identityCommitment: identity.commitment.toString(),
      },
    });
    expect(enrollRes.statusCode).toBe(200);
    expect(addedMembers).toContain(identity.commitment.toString());

    // 3. Resolve topic ID for the scope
    const topicRes = await app.inject({
      method: 'GET',
      url: '/api/topics/resolve?category=teaching&period=2026-Q4',
    });
    expect(topicRes.statusCode).toBe(200);
    const { topicId } = topicRes.json();
    expect(typeof topicId).toBe('number');

    // 4. Generate real Semaphore proof using numeric topic ID as scope
    const content = 'The operating systems lectures need more memory management hands-on lab problems.';
    const group = new Group([BigInt(identity.commitment.toString())]);
    const proof = await generateProof(
      identity,
      group,
      BigInt(hashToBigIntString(content)),
      BigInt(topicId)
    );

    // 5. Submit report
    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'teaching',
        scopeId: 'teaching:2026-Q4',
        content,
        proof: {
          merkleTreeDepth: proof.merkleTreeDepth,
          merkleTreeRoot: proof.merkleTreeRoot,
          nullifier: proof.nullifier,
          message: proof.message,
          scope: proof.scope,
          points: proof.points,
        },
      },
    });

    expect(submitRes.statusCode).toBe(201);
    const body = submitRes.json();
    expect(body.id).toBeDefined();

    // 6. Verify blockchain call occurred with numeric topic ID
    expect(submittedOnChain).toHaveLength(1);
    expect(submittedOnChain[0].topicId).toBe(topicId);

    // 7. Verify database record has confirmed status and tx_hash
    const reportRow = db.prepare('SELECT tx_hash, on_chain_status FROM reports WHERE id = ?').get(body.id) as any;
    expect(reportRow.tx_hash).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
    expect(reportRow.on_chain_status).toBe('confirmed');
  });

  it('should gracefully degrade when on-chain submission fails, still recording report', async () => {
    const mockBlockchain = new BlockchainService();
    Object.defineProperty(mockBlockchain, 'isConfigured', { get: () => true });
    mockBlockchain.submitProofOnChain = async () => {
      return { txHash: '0x0' as Hash, success: false, error: 'Gas estimation failed' };
    };

    const app = buildApp(db, mockBlockchain);

    const identity = new Identity();
    const enrollRes = await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-CHAIN-102',
        identityCommitment: identity.commitment.toString(),
      },
    });
    expect(enrollRes.statusCode).toBe(200);

    const topicRes = await app.inject({
      method: 'GET',
      url: '/api/topics/resolve?category=facilities&period=2026-Q4',
    });
    const { topicId } = topicRes.json();

    const content = 'The library 2nd floor air conditioning has been malfunctioning all week.';
    const group = new Group([BigInt(identity.commitment.toString())]);
    const proof = await generateProof(
      identity,
      group,
      BigInt(hashToBigIntString(content)),
      BigInt(topicId)
    );

    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'facilities',
        scopeId: 'facilities:2026-Q4',
        content,
        proof: {
          merkleTreeDepth: proof.merkleTreeDepth,
          merkleTreeRoot: proof.merkleTreeRoot,
          nullifier: proof.nullifier,
          message: proof.message,
          scope: proof.scope,
          points: proof.points,
        },
      },
    });

    expect(submitRes.statusCode).toBe(201);
    const body = submitRes.json();

    const reportRow = db.prepare('SELECT tx_hash, on_chain_status FROM reports WHERE id = ?').get(body.id) as any;
    expect(reportRow.on_chain_status).toBe('failed');
  });

  it('should reject duplicate submission before hitting the chain', async () => {
    let onChainCallCount = 0;
    const mockBlockchain = new BlockchainService();
    Object.defineProperty(mockBlockchain, 'isConfigured', { get: () => true });
    mockBlockchain.submitProofOnChain = async () => {
      onChainCallCount++;
      return { txHash: '0x1111' as Hash, success: true };
    };

    const app = buildApp(db, mockBlockchain);

    const identity = new Identity();
    const enrollRes = await app.inject({
      method: 'POST',
      url: '/api/enroll',
      payload: {
        studentTicket: 'STU-CHAIN-103',
        identityCommitment: identity.commitment.toString(),
      },
    });
    expect(enrollRes.statusCode).toBe(200);

    const topicRes = await app.inject({
      method: 'GET',
      url: '/api/topics/resolve?category=curriculum&period=2026-Q4',
    });
    const { topicId } = topicRes.json();

    const content1 = 'First report on course syllabus pacing.';
    const content2 = 'Second report attempting duplicate in same scope.';
    const group = new Group([BigInt(identity.commitment.toString())]);

    const proof1 = await generateProof(identity, group, BigInt(hashToBigIntString(content1)), BigInt(topicId));
    const proof2 = await generateProof(identity, group, BigInt(hashToBigIntString(content2)), BigInt(topicId));

    // First submission succeeds
    const res1 = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'curriculum',
        scopeId: 'curriculum:2026-Q4',
        content: content1,
        proof: {
          merkleTreeDepth: proof1.merkleTreeDepth,
          merkleTreeRoot: proof1.merkleTreeRoot,
          nullifier: proof1.nullifier,
          message: proof1.message,
          scope: proof1.scope,
          points: proof1.points,
        },
      },
    });
    expect(res1.statusCode).toBe(201);
    expect(onChainCallCount).toBe(1);

    // Second submission by same identity in SAME scope has identical nullifier -> 409 Conflict
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/reports',
      payload: {
        category: 'curriculum',
        scopeId: 'curriculum:2026-Q4',
        content: content2,
        proof: {
          merkleTreeDepth: proof2.merkleTreeDepth,
          merkleTreeRoot: proof2.merkleTreeRoot,
          nullifier: proof2.nullifier,
          message: proof2.message,
          scope: proof2.scope,
          points: proof2.points,
        },
      },
    });
    expect(res2.statusCode).toBe(409);
    // On-chain call was blocked by the nullifier check
    expect(onChainCallCount).toBe(1);
  });
});
