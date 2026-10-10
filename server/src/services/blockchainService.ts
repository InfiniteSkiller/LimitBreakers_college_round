import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hash,
  type PublicClient,
  type WalletClient,
  type Chain,
} from 'viem';
import { hardhat, sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

/* ------------------------------------------------------------------ */
/*  Minimal JSON ABIs — only the functions we call                    */
/* ------------------------------------------------------------------ */

const REPORTING_ABI = [
  {
    type: 'function' as const,
    name: 'submitWithProof',
    inputs: [
      { name: 'topicId', type: 'uint256' },
      {
        name: 'proof',
        type: 'tuple',
        components: [
          { name: 'merkleTreeDepth', type: 'uint256' },
          { name: 'merkleTreeRoot', type: 'uint256' },
          { name: 'nullifier', type: 'uint256' },
          { name: 'message', type: 'uint256' },
          { name: 'scope', type: 'uint256' },
          { name: 'points', type: 'uint256[8]' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'createTopic',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [{ name: 'topicId', type: 'uint256' }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'configureSemaphore',
    inputs: [
      { name: 'semaphoreAddress', type: 'address' },
      { name: 'groupId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'nextTopicId',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'nullifierUsed',
    inputs: [
      { name: 'topicId', type: 'uint256' },
      { name: 'nullifier', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'semaphoreConfigured',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view' as const,
  },
] as const;

const SEMAPHORE_ABI = [
  {
    type: 'function' as const,
    name: 'createGroup',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'addMember',
    inputs: [
      { name: 'groupId', type: 'uint256' },
      { name: 'identityCommitment', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'groupCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view' as const,
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  reportingAddress: Address;
  semaphoreAddress: Address;
  groupId: bigint;
  chainId?: number;
}

export interface OnChainResult {
  txHash: Hash;
  success: boolean;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

export class BlockchainService {
  private config: BlockchainConfig | null = null;
  private _publicClient: any = null;
  private _walletClient: any = null;

  /**
   * Create from environment variables.
   * Returns a configured service if all vars present, otherwise a disabled stub.
   */
  static fromEnv(): BlockchainService {
    const svc = new BlockchainService();

    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
    const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
    const reportingAddress = process.env.REPORTING_CONTRACT_ADDRESS;
    const semaphoreAddress = process.env.SEMAPHORE_CONTRACT_ADDRESS;
    const groupId = process.env.SEMAPHORE_GROUP_ID;

    if (rpcUrl && privateKey && reportingAddress && semaphoreAddress && groupId) {
      svc.configure({
        rpcUrl,
        privateKey,
        reportingAddress: reportingAddress as Address,
        semaphoreAddress: semaphoreAddress as Address,
        groupId: BigInt(groupId),
        chainId: process.env.BLOCKCHAIN_CHAIN_ID ? Number(process.env.BLOCKCHAIN_CHAIN_ID) : 31337,
      });
    }

    return svc;
  }

  /** Create with explicit config (useful for tests). */
  static withConfig(config: BlockchainConfig): BlockchainService {
    const svc = new BlockchainService();
    svc.configure(config);
    return svc;
  }

  private configure(config: BlockchainConfig) {
    this.config = config;
    const chain: Chain = config.chainId === 11155111 ? sepolia : hardhat;
    const account = privateKeyToAccount(config.privateKey as `0x${string}`);

    this._publicClient = createPublicClient({ chain, transport: http(config.rpcUrl) });
    this._walletClient = createWalletClient({ chain, transport: http(config.rpcUrl), account });
  }

  get isConfigured(): boolean {
    return this.config !== null;
  }

  /* -------------------------------------------------------------- */
  /*  On-chain operations (all gracefully no-op when not configured) */
  /* -------------------------------------------------------------- */

  /** Submit a verified proof on-chain via IncognitoReporting.submitWithProof */
  async submitProofOnChain(
    topicId: number,
    proof: {
      merkleTreeDepth: number;
      merkleTreeRoot: string;
      nullifier: string;
      message: string;
      scope: string;
      points: string[];
    }
  ): Promise<OnChainResult> {
    if (!this.config || !this._walletClient || !this._publicClient) {
      return { txHash: '0x0' as Hash, success: true, error: 'Blockchain not configured — off-chain only' };
    }

    try {
      const solidityProof = {
        merkleTreeDepth: BigInt(proof.merkleTreeDepth),
        merkleTreeRoot: BigInt(proof.merkleTreeRoot),
        nullifier: BigInt(proof.nullifier),
        message: BigInt(proof.message),
        scope: BigInt(proof.scope),
        points: (proof.points.map(BigInt) as unknown) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint],
      };

      const txHash = await this._walletClient.writeContract({
        address: this.config.reportingAddress,
        abi: REPORTING_ABI,
        functionName: 'submitWithProof',
        args: [BigInt(topicId), solidityProof],
      });

      await this._publicClient.waitForTransactionReceipt({ hash: txHash });
      return { txHash, success: true };
    } catch (err: any) {
      return { txHash: '0x0' as Hash, success: false, error: `On-chain submit failed: ${err.message}` };
    }
  }

  /** Add a member identity commitment to the on-chain Semaphore group */
  async addMemberOnChain(commitment: string): Promise<OnChainResult> {
    if (!this.config || !this._walletClient || !this._publicClient) {
      return { txHash: '0x0' as Hash, success: true, error: 'Blockchain not configured — off-chain only' };
    }

    try {
      const txHash = await this._walletClient.writeContract({
        address: this.config.semaphoreAddress,
        abi: SEMAPHORE_ABI,
        functionName: 'addMember',
        args: [this.config.groupId, BigInt(commitment)],
      });

      await this._publicClient.waitForTransactionReceipt({ hash: txHash });
      return { txHash, success: true };
    } catch (err: any) {
      return { txHash: '0x0' as Hash, success: false, error: `On-chain enrollment failed: ${err.message}` };
    }
  }

  /** Create a topic on the IncognitoReporting contract */
  async createTopicOnChain(name: string): Promise<OnChainResult & { topicId?: number }> {
    if (!this.config || !this._walletClient || !this._publicClient) {
      return { txHash: '0x0' as Hash, success: true };
    }

    try {
      const txHash = await this._walletClient.writeContract({
        address: this.config.reportingAddress,
        abi: REPORTING_ABI,
        functionName: 'createTopic',
        args: [name],
      });

      await this._publicClient.waitForTransactionReceipt({ hash: txHash });

      const nextId = await this._publicClient.readContract({
        address: this.config.reportingAddress,
        abi: REPORTING_ABI,
        functionName: 'nextTopicId',
      });

      return { txHash, success: true, topicId: Number(nextId) - 1 };
    } catch (err: any) {
      return { txHash: '0x0' as Hash, success: false, error: `On-chain topic creation failed: ${err.message}` };
    }
  }

  /** Check whether a nullifier has already been used on-chain for a topic */
  async isNullifierUsedOnChain(topicId: number, nullifier: string): Promise<boolean> {
    if (!this.config || !this._publicClient) return false;

    try {
      return (await this._publicClient.readContract({
        address: this.config.reportingAddress,
        abi: REPORTING_ABI,
        functionName: 'nullifierUsed',
        args: [BigInt(topicId), BigInt(nullifier)],
      })) as boolean;
    } catch {
      return false;
    }
  }
}
