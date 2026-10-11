/**
 * REAL end-to-end test: backend + real Semaphore/IncognitoReporting contracts
 * on a running JSON-RPC node. Skipped unless CHAIN_ENABLED=true is set.
 *
 *   (blockchain/)  npx hardhat node
 *   (blockchain/)  npx hardhat run scripts/deploy-and-configure.ts --network localhost
 *   (server/)      CHAIN_ENABLED=true CHAIN_RPC_URL=... CHAIN_PRIVATE_KEY=... \
 *                  SEMAPHORE_ADDRESS=... REPORTING_ADDRESS=... SEMAPHORE_GROUP_ID=0 \
 *                  npx vitest run tests/chain.e2e.test.ts
 *
 * Needs a FRESH deployment each run (the group must start empty).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { Identity } from '@semaphore-protocol/identity';
import { createPublicClient, createWalletClient, http, parseAbi, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/database.js';
import { EnrollmentService } from '../src/services/enrollmentService.js';
import { createChainServiceFromEnv } from '../src/services/chainService.js';
import { makeProof, toPayloadProof } from './helpers/proof.js';

const enabled = process.env.CHAIN_ENABLED === 'true';

const reportingAbi = parseAbi([
  'function nullifierUsed(uint256 topicId, uint256 nullifier) view returns (bool)',
  'function setTopicActive(uint256 topicId, bool active)',
]);

describe.skipIf(!enabled)('End-to-end: enrollment → sync → proof → backend → chain → SQLite', () => {
  const scopeA = 'teaching:2026-Q4';
  const scopeB = 'safety:2026-Q4';
  let app: ReturnType<typeof buildApp>;
  let db: ReturnType<typeof createDatabase>;
  let publicClient: ReturnType<typeof createPublicClient>;
  let wallet: ReturnType<typeof createWalletClient>;
  let reporting: Hex;
  const alice = new Identity();
  const bob = new Identity();
  const carol = new Identity();
  let commitments: string[];

  const j = async (r: Promise<any>) => { const x = await r; return { status: x.statusCode as number, body: x.json() }; };
  const resolve = (scopeId: string) => j(app.inject({ method: 'GET', url: `/api/topics/resolve?scopeId=${scopeId}` }));
  const status = () => j(app.inject({ method: 'GET', url: '/api/chain/status' }));

  async function submit(id: Identity, scopeId: string, content: string, proofScope: string, tamper = false) {
    const proof = toPayloadProof(await makeProof(id, commitments, content, proofScope));
    if (tamper) proof.points[0] = (BigInt(proof.points[0]) + 1n).toString();
    return j(app.inject({
      method: 'POST', url: '/api/reports',
      payload: { category: scopeId.split(':')[0], scopeId, content, proof },
    }));
  }

  beforeAll(async () => {
    const chain = createChainServiceFromEnv();
    const rpc = process.env.CHAIN_RPC_URL!;
    reporting = process.env.REPORTING_ADDRESS as Hex;
    publicClient = createPublicClient({ transport: http(rpc) });
    wallet = createWalletClient({ account: privateKeyToAccount(process.env.CHAIN_PRIVATE_KEY as Hex), transport: http(rpc) });

    db = createDatabase(':memory:');
    // Alice and Bob were enrolled BEFORE the chain was connected (like the seeded demo
    // students). Startup sync must catch the chain up to them.
    const offline = new EnrollmentService(db);
    offline.enrollCommitment('STU-ALICE', alice.commitment.toString());
    offline.enrollCommitment('STU-BOB', bob.commitment.toString());

    app = buildApp(db, chain);
    await app.ready();
  }, 120_000);

  it('1. startup sync put the pre-existing members on-chain and the roots match', async () => {
    const s = await status();
    expect(s.body.onChainMemberCount).toBe(2);
    expect(s.body.inSync).toBe(true);
  });

  it('2. a new enrollment is added on-chain too, roots still match', async () => {
    const r = await j(app.inject({
      method: 'POST', url: '/api/enroll',
      payload: { studentTicket: 'STU-CAROL', identityCommitment: carol.commitment.toString() },
    }));
    expect(r.status).toBe(200);
    expect(r.body.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    commitments = [alice, bob, carol].map((i) => i.commitment.toString());
    const s = await status();
    expect(s.body.onChainMemberCount).toBe(3);
    expect(s.body.inSync).toBe(true);
  }, 60_000);

  it('3. valid proof bound to the topic ID is verified on-chain and saved off-chain', async () => {
    const t = await resolve(scopeA);
    expect(t.body.topicId).toBe(1);
    const res = await submit(alice, scopeA, 'Slides lack worked examples.', t.body.proofScope);
    expect(res.status).toBe(201);
    expect(res.body.txHash).toMatch(/^0x[0-9a-f]{64}$/);

    const row = db.prepare('SELECT tx_hash, topic_id, nullifier FROM reports r JOIN nullifiers n ON n.scope_id = r.scope_id WHERE r.scope_id = ?').get(scopeA) as any;
    expect(row.tx_hash).toBe(res.body.txHash);
    const used = await publicClient.readContract({
      address: reporting, abi: reportingAbi, functionName: 'nullifierUsed', args: [1n, BigInt(row.nullifier)],
    });
    expect(used).toBe(true); // recorded on the real contract
  }, 120_000);

  it('4. the same identity cannot submit twice to the same topic', async () => {
    const t = await resolve(scopeA);
    const dup = await submit(alice, scopeA, 'Trying again with other words.', t.body.proofScope);
    expect(dup.status).toBe(409);
  }, 120_000);

  it('5. the same identity CAN submit to a second topic (different nullifier)', async () => {
    const t = await resolve(scopeB);
    expect(t.body.topicId).toBe(2);
    const res = await submit(alice, scopeB, 'Door lock on lab 3 is broken.', t.body.proofScope);
    expect(res.status).toBe(201);
    const nullifiers = db.prepare('SELECT nullifier FROM nullifiers').all() as any[];
    expect(new Set(nullifiers.map((n) => n.nullifier)).size).toBe(nullifiers.length);
  }, 120_000);

  it('6. a tampered proof is rejected and nothing is saved', async () => {
    const before = (db.prepare('SELECT COUNT(*) c FROM reports').get() as any).c;
    const t = await resolve(scopeA);
    const res = await submit(bob, scopeA, 'Bob tampered proof test.', t.body.proofScope, true);
    expect(res.status).toBe(401);
    expect((db.prepare('SELECT COUNT(*) c FROM reports').get() as any).c).toBe(before);
  }, 120_000);

  it('7. the OLD hashed scope is rejected', async () => {
    const { hashToBigIntString } = await import('../src/services/verifier.js');
    const res = await submit(bob, scopeA, 'Bob using legacy scope.', hashToBigIntString(scopeA));
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Scope binding mismatch');
  }, 120_000);

  it('8. an inactive on-chain topic rejects the submission, and Bob can retry after reopening it', async () => {
    const t = await resolve(scopeA);
    await publicClient.waitForTransactionReceipt({
      hash: await wallet.writeContract({ chain: undefined, account: wallet.account!, address: reporting, abi: reportingAbi, functionName: 'setTopicActive', args: [1n, false] }),
    });
    const closed = await submit(bob, scopeA, 'Bob writing to a closed topic.', t.body.proofScope);
    expect(closed.status).toBe(401);
    expect(closed.body.error).toContain('TopicInactive');

    await publicClient.waitForTransactionReceipt({
      hash: await wallet.writeContract({ chain: undefined, account: wallet.account!, address: reporting, abi: reportingAbi, functionName: 'setTopicActive', args: [1n, true] }),
    });
    const open = await submit(bob, scopeA, 'Bob writing after reopening.', t.body.proofScope);
    expect(open.status).toBe(201); // the failed attempt did not burn Bob's nullifier
  }, 180_000);

  it('9. a proof against a stale group root is rejected', async () => {
    const t = await resolve(scopeB);
    const stale = [alice, bob].map((i) => i.commitment.toString()); // missing Carol → wrong root
    const proof = toPayloadProof(await makeProof(bob, stale, 'Bob stale root attempt.', t.body.proofScope));
    const res = await j(app.inject({
      method: 'POST', url: '/api/reports',
      payload: { category: 'safety', scopeId: scopeB, content: 'Bob stale root attempt.', proof },
    }));
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Merkle Root');
  }, 120_000);
});
