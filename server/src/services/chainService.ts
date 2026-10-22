import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  BaseError,
  ContractFunctionRevertedError,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

export interface ChainProof {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
}

export type ChainErrorCode =
  | 'NULLIFIER_USED'
  | 'TOPIC_INACTIVE'
  | 'INVALID_TOPIC'
  | 'WRONG_SCOPE'
  | 'INVALID_PROOF'
  | 'CHAIN_UNAVAILABLE';

export class ChainError extends Error {
  constructor(public code: ChainErrorCode, message: string) {
    super(message);
    this.name = 'ChainError';
  }
}

export interface ChainStatus {
  enabled: boolean;
  chainId?: number;
  semaphoreAddress?: string;
  reportingAddress?: string;
  groupId?: string;
  onChainRoot?: string;
  onChainMemberCount?: number;
  backendAddress?: string;
}

export interface SyncResult {
  added: number;
  onChainRoot: string;
  rootMatches: boolean;
}

export interface ChainService {
  readonly enabled: boolean;
  /** Identifies the deployment so topic IDs from an old deployment are never reused. */
  readonly deploymentKey: string;
  status(): Promise<ChainStatus>;
  /** Make the on-chain group equal to `commitments` (same order). Only appends. */
  syncMembers(commitments: string[], expectedRoot: string): Promise<SyncResult>;
  addMember(commitment: string): Promise<{ txHash: string }>;
  createTopic(name: string): Promise<{ topicId: number; txHash: string }>;
  submitWithProof(topicId: number, proof: ChainProof): Promise<{ txHash: string }>;
}

/** Used when no blockchain is configured: the app runs fully off-chain. */
export class DisabledChainService implements ChainService {
  readonly enabled = false;
  readonly deploymentKey = 'off-chain';
  async status(): Promise<ChainStatus> {
    return { enabled: false };
  }
  async syncMembers(): Promise<SyncResult> {
    return { added: 0, onChainRoot: '0', rootMatches: true };
  }
  async addMember(): Promise<{ txHash: string }> {
    throw new Error('Chain is disabled');
  }
  async createTopic(): Promise<{ topicId: number; txHash: string }> {
    throw new Error('Chain is disabled');
  }
  async submitWithProof(): Promise<{ txHash: string }> {
    throw new Error('Chain is disabled');
  }
}

const proofTuple =
  '(uint256 merkleTreeDepth, uint256 merkleTreeRoot, uint256 nullifier, uint256 message, uint256 scope, uint256[8] points)';

const semaphoreAbi = parseAbi([
  'function groupCounter() view returns (uint256)',
  'function getGroupAdmin(uint256 groupId) view returns (address)',
  'function getMerkleTreeRoot(uint256 groupId) view returns (uint256)',
  'function getMerkleTreeSize(uint256 groupId) view returns (uint256)',
  'function addMember(uint256 groupId, uint256 identityCommitment)',
  'function addMembers(uint256 groupId, uint256[] identityCommitments)',
]);

const reportingAbi = parseAbi([
  'function owner() view returns (address)',
  'function semaphoreConfigured() view returns (bool)',
  'function createTopic(string name) returns (uint256 topicId)',
  `function submitWithProof(uint256 topicId, ${proofTuple} proof)`,
  'error Unauthorized()',
  'error InvalidTopic()',
  'error TopicInactive()',
  'error NullifierAlreadyUsed()',
  'error ZeroNullifier()',
  'error SemaphoreNotConfigured()',
  'error WrongProofScope()',
  'error InvalidProof()',
]);

const REVERT_TO_CODE: Record<string, ChainErrorCode> = {
  NullifierAlreadyUsed: 'NULLIFIER_USED',
  TopicInactive: 'TOPIC_INACTIVE',
  InvalidTopic: 'INVALID_TOPIC',
  WrongProofScope: 'WRONG_SCOPE',
  InvalidProof: 'INVALID_PROOF',
  ZeroNullifier: 'INVALID_PROOF',
};

function translateError(err: unknown): ChainError {
  if (err instanceof ChainError) return err;
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName;
      if (name && REVERT_TO_CODE[name]) {
        return new ChainError(REVERT_TO_CODE[name], `On-chain rejection: ${name}`);
      }
      return new ChainError('INVALID_PROOF', `On-chain revert: ${name ?? revert.shortMessage}`);
    }
    return new ChainError('CHAIN_UNAVAILABLE', err.shortMessage);
  }
  return new ChainError('CHAIN_UNAVAILABLE', (err as Error)?.message ?? 'Unknown chain error');
}

export interface ViemChainConfig {
  rpcUrl: string;
  privateKey: Hex;
  semaphoreAddress: Address;
  reportingAddress: Address;
  groupId: bigint;
}

const MEMBER_BATCH = 50;

export class ViemChainService implements ChainService {
  readonly enabled = true;
  readonly deploymentKey: string;

  private publicClient;
  private walletClient;
  private account;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private cfg: ViemChainConfig) {
    this.account = privateKeyToAccount(cfg.privateKey);
    const transport = http(cfg.rpcUrl);
    this.publicClient = createPublicClient({ transport });
    this.walletClient = createWalletClient({ account: this.account, transport });
    this.deploymentKey = `${cfg.reportingAddress.toLowerCase()}:${cfg.groupId}`;
  }

  /** Every write goes through one queue so nonces and member order stay deterministic. */
  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async confirm(hash: Hex): Promise<void> {
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      throw new ChainError('CHAIN_UNAVAILABLE', `Transaction ${hash} reverted`);
    }
  }

  async status(): Promise<ChainStatus> {
    const { semaphoreAddress, reportingAddress, groupId } = this.cfg;
    const [chainId, onChainRoot, size] = await Promise.all([
      this.publicClient.getChainId(),
      this.publicClient.readContract({
        address: semaphoreAddress, abi: semaphoreAbi, functionName: 'getMerkleTreeRoot', args: [groupId],
      }),
      this.publicClient.readContract({
        address: semaphoreAddress, abi: semaphoreAbi, functionName: 'getMerkleTreeSize', args: [groupId],
      }),
    ]);
    return {
      enabled: true,
      chainId,
      semaphoreAddress,
      reportingAddress,
      groupId: groupId.toString(),
      onChainRoot: onChainRoot.toString(),
      onChainMemberCount: Number(size),
      backendAddress: this.account.address,
    };
  }

  /**
   * Startup check + catch-up. Fails fast if the wallet is not authorised,
   * because every later enrollment/topic/submission would fail anyway.
   */
  async syncMembers(commitments: string[], expectedRoot: string): Promise<SyncResult> {
    const { semaphoreAddress, reportingAddress, groupId } = this.cfg;

    const [admin, owner, configured] = await Promise.all([
      this.publicClient.readContract({
        address: semaphoreAddress, abi: semaphoreAbi, functionName: 'getGroupAdmin', args: [groupId],
      }),
      this.publicClient.readContract({ address: reportingAddress, abi: reportingAbi, functionName: 'owner' }),
      this.publicClient.readContract({ address: reportingAddress, abi: reportingAbi, functionName: 'semaphoreConfigured' }),
    ]);
    const me = this.account.address.toLowerCase();
    if (admin.toLowerCase() !== me) {
      throw new Error(`Backend wallet ${this.account.address} is not admin of Semaphore group ${groupId} (admin is ${admin}).`);
    }
    if (owner.toLowerCase() !== me) {
      throw new Error(`Backend wallet ${this.account.address} does not own IncognitoReporting (owner is ${owner}).`);
    }
    if (!configured) {
      throw new Error('IncognitoReporting.configureSemaphore() has not been called. Run the deploy script.');
    }

    return this.enqueue(async () => {
      const size = Number(
        await this.publicClient.readContract({
          address: semaphoreAddress, abi: semaphoreAbi, functionName: 'getMerkleTreeSize', args: [groupId],
        })
      );
      if (size > commitments.length) {
        throw new Error(
          `On-chain group has ${size} members but the backend database only has ${commitments.length}. ` +
            'The database and chain are out of sync (database reset against an old deployment?). Redeploy or restore the database.'
        );
      }

      let added = 0;
      const missing = commitments.slice(size);
      for (let i = 0; i < missing.length; i += MEMBER_BATCH) {
        const batch = missing.slice(i, i + MEMBER_BATCH).map((c) => BigInt(c));
        const hash = await this.walletClient.writeContract({
          chain: undefined,
          address: semaphoreAddress, abi: semaphoreAbi, functionName: 'addMembers', args: [groupId, batch],
        });
        await this.confirm(hash);
        added += batch.length;
      }

      const onChainRoot = (
        await this.publicClient.readContract({
          address: semaphoreAddress, abi: semaphoreAbi, functionName: 'getMerkleTreeRoot', args: [groupId],
        })
      ).toString();
      return { added, onChainRoot, rootMatches: commitments.length === 0 || onChainRoot === expectedRoot };
    });
  }

  addMember(commitment: string): Promise<{ txHash: string }> {
    return this.enqueue(async () => {
      try {
        const hash = await this.walletClient.writeContract({
          chain: undefined,
          address: this.cfg.semaphoreAddress, abi: semaphoreAbi, functionName: 'addMember',
          args: [this.cfg.groupId, BigInt(commitment)],
        });
        await this.confirm(hash);
        return { txHash: hash };
      } catch (err) {
        throw translateError(err);
      }
    });
  }

  createTopic(name: string): Promise<{ topicId: number; txHash: string }> {
    return this.enqueue(async () => {
      try {
        // simulate first: it returns the topicId the call will produce.
        const { request, result } = await this.publicClient.simulateContract({
          account: this.account,
          address: this.cfg.reportingAddress, abi: reportingAbi, functionName: 'createTopic', args: [name],
        });
        const hash = await this.walletClient.writeContract({ ...request, chain: undefined });
        await this.confirm(hash);
        return { topicId: Number(result), txHash: hash };
      } catch (err) {
        throw translateError(err);
      }
    });
  }

  submitWithProof(topicId: number, proof: ChainProof): Promise<{ txHash: string }> {
    return this.enqueue(async () => {
      try {
        const args = [
          BigInt(topicId),
          {
            merkleTreeDepth: BigInt(proof.merkleTreeDepth),
            merkleTreeRoot: BigInt(proof.merkleTreeRoot),
            nullifier: BigInt(proof.nullifier),
            message: BigInt(proof.message),
            scope: BigInt(proof.scope),
            points: proof.points.map((p) => BigInt(p)) as unknown as readonly [
              bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint
            ],
          },
        ] as const;
        // Simulating surfaces the contract's custom error before any gas is spent.
        const { request } = await this.publicClient.simulateContract({
          account: this.account,
          address: this.cfg.reportingAddress, abi: reportingAbi, functionName: 'submitWithProof', args,
        });
        const hash = await this.walletClient.writeContract({ ...request, chain: undefined });
        await this.confirm(hash);
        return { txHash: hash };
      } catch (err) {
        throw translateError(err);
      }
    });
  }
}

/** Builds the chain service from env vars; returns a disabled one unless CHAIN_ENABLED=true. */
export function createChainServiceFromEnv(env: NodeJS.ProcessEnv = process.env): ChainService {
  if (env.CHAIN_ENABLED !== 'true') return new DisabledChainService();

  const required = ['CHAIN_RPC_URL', 'CHAIN_PRIVATE_KEY', 'SEMAPHORE_ADDRESS', 'REPORTING_ADDRESS', 'SEMAPHORE_GROUP_ID'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(`CHAIN_ENABLED=true but these env vars are missing: ${missing.join(', ')}`);
  }
  const pk = env.CHAIN_PRIVATE_KEY!.startsWith('0x') ? env.CHAIN_PRIVATE_KEY! : `0x${env.CHAIN_PRIVATE_KEY}`;
  return new ViemChainService({
    rpcUrl: env.CHAIN_RPC_URL!,
    privateKey: pk as Hex,
    semaphoreAddress: env.SEMAPHORE_ADDRESS as Address,
    reportingAddress: env.REPORTING_ADDRESS as Address,
    groupId: BigInt(env.SEMAPHORE_GROUP_ID!),
  });
}
