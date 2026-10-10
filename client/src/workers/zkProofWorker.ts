/**
 * zkProofWorker.ts
 * Web Worker — runs Semaphore ZK proof generation off the main thread.
 * The heavy snarkjs/WASM work happens here so the UI stays responsive.
 */

import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof } from '@semaphore-protocol/proof';

export type ZKWorkerRequest = {
  type: 'GENERATE_PROOF';
  identityExport: string;
  commitments: string[];
  messageBigIntStr: string;
  scopeBigIntStr: string;
  wasmPath: string;
  zkeyPath: string;
};

export type ZKWorkerResponse =
  | { type: 'PROOF_SUCCESS'; proof: SerializableProof }
  | { type: 'PROOF_ERROR'; error: string };

export interface SerializableProof {
  merkleTreeDepth: number;
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];
}

function serializeProof(proof: any): SerializableProof {
  return {
    merkleTreeDepth: Number(proof.merkleTreeDepth),
    merkleTreeRoot: String(proof.merkleTreeRoot),
    nullifier: String(proof.nullifier),
    message: String(proof.message),
    scope: String(proof.scope),
    points: (proof.points as any[]).map((p: any) => String(p)),
  };
}

self.onmessage = async (event: MessageEvent<ZKWorkerRequest>) => {
  const { type, identityExport, commitments, messageBigIntStr, scopeBigIntStr, wasmPath, zkeyPath } = event.data;

  if (type !== 'GENERATE_PROOF') return;

  try {
    const identity = new Identity(identityExport);
    const group = new Group(commitments);

    const rawProof = await generateProof(
      identity,
      group,
      messageBigIntStr,
      scopeBigIntStr,
      16,
      { wasm: wasmPath, zkey: zkeyPath }
    );

    const proof = serializeProof(rawProof);
    const response: ZKWorkerResponse = { type: 'PROOF_SUCCESS', proof };
    self.postMessage(response);
  } catch (err: any) {
    const response: ZKWorkerResponse = {
      type: 'PROOF_ERROR',
      error: err?.message ?? 'Unknown worker error during proof generation',
    };
    self.postMessage(response);
  }
};
