import { describe, it, expect, beforeEach } from 'vitest';
import { Identity } from '@semaphore-protocol/identity';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/database.js';
import {
  ChainError,
  type ChainProof,
  type ChainService,
  type SyncResult,
} from '../src/services/chainService.js';
import { hashToBigIntString } from '../src/services/verifier.js';
import { makeProof, toPayloadProof } from './helpers/proof.js';

/** In-memory stand-in for the contracts, mirroring IncognitoReporting's rules. */
class FakeChain implements ChainService {
  readonly enabled = true;
  readonly deploymentKey = 'fake:0';
  members: string[] = [];
  topics: { name: string; active: boolean }[] = [];
  used = new Set<string>();
  failNextAddMember = false;
  failNextSubmitWith: ChainError | null = null;
  submitted: { topicId: number; proof: ChainProof }[] = [];

  async status() { return { enabled: true }; }
  async syncMembers(c: string[]): Promise<SyncResult> {
    this.members = [...c];
    return { added: c.length, onChainRoot: '0', rootMatches: true };
  }
  async addMember(commitment: string) {
    if (this.failNextAddMember) { this.failNextAddMember = false; throw new ChainError('CHAIN_UNAVAILABLE', 'rpc down'); }
    this.members.push(commitment);
    return { txHash: '0xadd' + this.members.length };
  }
  async createTopic(name: string) {
    this.topics.push({ name, active: true });
    return { topicId: this.topics.length, txHash: '0xtopic' + this.topics.length };
  }
  async submitWithProof(topicId: number, proof: ChainProof) {
    if (this.failNextSubmitWith) { const e = this.failNextSubmitWith; this.failNextSubmitWith = null; throw e; }
    const t = this.topics[topicId - 1];
    if (!t) throw new ChainError('INVALID_TOPIC', 'no such topic');
    if (!t.active) throw new ChainError('TOPIC_INACTIVE', 'inactive');
    if (proof.scope !== String(topicId)) throw new ChainError('WRONG_SCOPE', 'wrong scope');
    const key = `${topicId}:${proof.nullifier}`;
    if (this.used.has(key)) throw new ChainError('NULLIFIER_USED', 'used');
    this.used.add(key);
    this.submitted.push({ topicId, proof });
    return { txHash: '0xsubmit' + this.submitted.length };
  }
}

describe('Blockchain-backed submission flow (fake chain)', () => {
  let chain: FakeChain;
  let app: ReturnType<typeof buildApp>;
  let db: ReturnType<typeof createDatabase>;
  let identity: Identity;
  let commitments: string[];

  const scopeA = 'teaching:2026-Q4';
  const scopeB = 'facilities:2026-Q4';

  async function enroll(id: Identity, ticket: string) {
    return app.inject({
      method: 'POST', url: '/api/enroll',
      payload: { studentTicket: ticket, identityCommitment: id.commitment.toString() },
    });
  }
  async function resolve(scopeId: string) {
    const r = await app.inject({ method: 'GET', url: `/api/topics/resolve?scopeId=${encodeURIComponent(scopeId)}` });
    return { status: r.statusCode, body: r.json() };
  }
  async function submit(scopeId: string, content: string, proofScope: string) {
    const proof = await makeProof(identity, commitments, content, proofScope);
    return app.inject({
      method: 'POST', url: '/api/reports',
      payload: { category: scopeId.split(':')[0], scopeId, content, proof: toPayloadProof(proof) },
    });
  }

  beforeEach(async () => {
    chain = new FakeChain();
    db = createDatabase(':memory:');
    app = buildApp(db, chain);
    identity = new Identity();
    const r = await enroll(identity, 'STU-FAKE-1');
    expect(r.statusCode).toBe(200);
    commitments = [identity.commitment.toString()];
  });

  it('enrollment adds the commitment to the on-chain group and returns the tx hash', async () => {
    expect(chain.members).toEqual(commitments);
    const again = await enroll(identity, 'STU-FAKE-1'); // idempotent: no second on-chain add
    expect(again.statusCode).toBe(200);
    expect(chain.members).toHaveLength(1);
  });

  it('rolls back the enrollment if the on-chain add fails', async () => {
    const other = new Identity();
    chain.failNextAddMember = true;
    const r = await enroll(other, 'STU-FAKE-2');
    expect(r.statusCode).toBe(400);
    const state = (await app.inject({ method: 'GET', url: '/api/group/state' })).json();
    expect(state.commitments).toEqual(commitments); // backend group still equals chain group
  });

  it('resolves the scope to the numeric topic ID, stable across calls, distinct per scope', async () => {
    const a1 = await resolve(scopeA);
    const a2 = await resolve(scopeA);
    const b = await resolve(scopeB);
    expect(a1.body.topicId).toBe(1);
    expect(a1.body.proofScope).toBe('1');
    expect(a2.body.topicId).toBe(1);
    expect(b.body.topicId).toBe(2);
    expect(chain.topics).toHaveLength(2); // second resolve did not create a second topic
  });

  it('rejects unknown categories/periods so the public endpoint cannot burn gas', async () => {
    expect((await resolve('hacking:2026-Q4')).status).toBe(400);
    expect((await resolve('teaching:tomorrow')).status).toBe(400);
    expect(chain.topics).toHaveLength(0);
  });

  it('accepts a topic-scoped proof, submits it on-chain and stores the tx hash', async () => {
    const { body } = await resolve(scopeA);
    const res = await submit(scopeA, 'Lab hours clash with lectures.', body.proofScope);
    expect(res.statusCode).toBe(201);
    expect(res.json().txHash).toBe('0xsubmit1');
    expect(chain.submitted).toHaveLength(1);
    const row = db.prepare('SELECT tx_hash, topic_id FROM reports WHERE scope_id = ?').get(scopeA) as any;
    expect(row.tx_hash).toBe('0xsubmit1');
    expect(row.topic_id).toBe(1);
  });

  it('rejects the OLD hashed-string scope now that scope must be the topic ID', async () => {
    await resolve(scopeA);
    const res = await submit(scopeA, 'Using the legacy hashed scope.', hashToBigIntString(scopeA));
    expect(res.statusCode).toBe(401);
    expect(res.json().error).toContain('Scope binding mismatch');
    expect(chain.submitted).toHaveLength(0);
  });

  it('blocks a duplicate in the same topic (off-chain check fires before any gas is spent)', async () => {
    const { body } = await resolve(scopeA);
    expect((await submit(scopeA, 'First report on teaching.', body.proofScope)).statusCode).toBe(201);
    const dup = await submit(scopeA, 'Second attempt, different text.', body.proofScope);
    expect(dup.statusCode).toBe(409);
    expect(chain.submitted).toHaveLength(1);
  });

  it('treats an on-chain duplicate as a 409 even if the database lost its record', async () => {
    const { body } = await resolve(scopeA);
    expect((await submit(scopeA, 'First report on teaching.', body.proofScope)).statusCode).toBe(201);
    db.prepare('DELETE FROM nullifiers').run(); // simulate a wiped/restored database
    const dup = await submit(scopeA, 'Second attempt after db wipe.', body.proofScope);
    expect(dup.statusCode).toBe(409);
    expect(dup.json().error).toContain('blockchain');
  });

  it('lets the same identity report once per topic (different nullifier per topic)', async () => {
    const a = await resolve(scopeA);
    const b = await resolve(scopeB);
    const ra = await submit(scopeA, 'Teaching feedback goes here.', a.body.proofScope);
    const rb = await submit(scopeB, 'Facilities feedback goes here.', b.body.proofScope);
    expect(ra.statusCode).toBe(201);
    expect(rb.statusCode).toBe(201);
    const nullifiers = chain.submitted.map((s) => s.proof.nullifier);
    expect(new Set(nullifiers).size).toBe(2);
  });

  it('on an inactive topic: rejects, saves nothing, and frees the nullifier', async () => {
    const { body } = await resolve(scopeA);
    chain.topics[0].active = false;
    const res = await submit(scopeA, 'Report to a closed topic.', body.proofScope);
    expect(res.statusCode).toBe(401);
    expect((db.prepare('SELECT COUNT(*) c FROM reports').get() as any).c).toBe(0);
    expect((db.prepare('SELECT COUNT(*) c FROM nullifiers').get() as any).c).toBe(0);
    chain.topics[0].active = true; // reopened: the same identity can now submit
    expect((await submit(scopeA, 'Report after reopening.', body.proofScope)).statusCode).toBe(201);
  });

  it('when the chain is unreachable: 502, nothing saved, user can retry', async () => {
    const { body } = await resolve(scopeA);
    chain.failNextSubmitWith = new ChainError('CHAIN_UNAVAILABLE', 'rpc timeout');
    const res = await submit(scopeA, 'Report during an outage.', body.proofScope);
    expect(res.statusCode).toBe(502);
    expect((db.prepare('SELECT COUNT(*) c FROM reports').get() as any).c).toBe(0);
    expect((await submit(scopeA, 'Report after the outage.', body.proofScope)).statusCode).toBe(201);
  });
});
