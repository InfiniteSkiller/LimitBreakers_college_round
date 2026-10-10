import { verifyProof } from '@semaphore-protocol/proof';
import { Group } from '@semaphore-protocol/group';
import { EnrollmentService } from './enrollmentService.js';

export interface SemaphoreProofInput {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
}

export interface VerificationResult {
  isValid: boolean;
  nullifier?: string;
  scopeId?: string;
  error?: string;
  isSimulated: boolean;
}

export function hashToBigIntString(str: string): string {
  let hash = 0n;
  for (let i = 0; i < str.length; i++) {
    const char = BigInt(str.charCodeAt(i));
    hash = (hash * 31n + char) & 0xFFFFFFFFFFFFFFFFn;
  }
  return hash.toString();
}

export class SemaphoreMembershipVerifier {
  private enrollmentService: EnrollmentService;

  constructor(enrollmentService: EnrollmentService) {
    this.enrollmentService = enrollmentService;
  }

  /**
   * Verify an incoming Semaphore ZK Membership Proof
   */
  public async verifyMembershipProof(
    proof: SemaphoreProofInput,
    expectedScopeId: string,
    expectedContent: string
  ): Promise<VerificationResult> {
    if (!proof || typeof proof !== 'object') {
      return { isValid: false, error: 'Proof object missing or invalid', isSimulated: false };
    }

    const { merkleTreeDepth, merkleTreeRoot, nullifier, message, scope, points } = proof;

    if (!merkleTreeDepth || !merkleTreeRoot || !nullifier || !message || !scope || !Array.isArray(points)) {
      return { isValid: false, error: 'Malformed proof payload. Missing required Semaphore proof fields.', isSimulated: false };
    }

    // 1. Validate scope and message binding against expected scope & content
    const expectedScopeBigIntStr = hashToBigIntString(expectedScopeId);
    if (scope !== expectedScopeBigIntStr && scope !== expectedScopeId) {
      return {
        isValid: false,
        error: `Scope binding mismatch: Proof bound to scope '${scope}', expected '${expectedScopeBigIntStr}' for scope '${expectedScopeId}'`,
        isSimulated: false,
      };
    }

    const expectedMessageBigIntStr = hashToBigIntString(expectedContent);
    if (message !== expectedMessageBigIntStr && message !== expectedContent) {
      return {
        isValid: false,
        error: `Message binding mismatch: Proof message does not match submitted report content.`,
        isSimulated: false,
      };
    }

    try {
      // 2. Reconstruct trusted server Semaphore group
      const commitments = this.enrollmentService.getEnrolledCommitments();
      if (commitments.length === 0) {
        return { isValid: false, error: 'Server Semaphore group is empty. No enrolled identities exist.', isSimulated: false };
      }

      const serverGroup = new Group(commitments);

      // 3. Validate Merkle root against trusted server group state
      if (merkleTreeRoot !== serverGroup.root.toString()) {
        return {
          isValid: false,
          error: `Untrusted or Stale Merkle Root: Proof root (${merkleTreeRoot.slice(0, 10)}...) does not match server trusted group root (${serverGroup.root.toString().slice(0, 10)}...).`,
          isSimulated: false,
        };
      }

      // 4. Perform cryptographic zero-knowledge proof verification
      const isVerified = await verifyProof({
        merkleTreeDepth,
        merkleTreeRoot,
        nullifier,
        message,
        scope,
        points,
      });

      if (!isVerified) {
        return { isValid: false, error: 'Semaphore ZK proof cryptographic verification failed.', isSimulated: false };
      }

      return {
        isValid: true,
        nullifier,
        scopeId: expectedScopeId,
        isSimulated: false,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `Verification error: ${err.message || 'Unknown error during ZK proof verification'}`,
        isSimulated: false,
      };
    }
  }
}
