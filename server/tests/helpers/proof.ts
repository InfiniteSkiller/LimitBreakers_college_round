import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof } from '@semaphore-protocol/proof';
import { hashToBigIntString } from '../../src/services/verifier.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// The depth-16 circuit files already shipped with the client. Using them keeps
// proof generation offline instead of downloading from snark-artifacts.pse.dev.
const artifactsDir = path.resolve(here, '../../../client/public/snark-artifacts');

export function makeProof(identity: Identity, commitments: string[], content: string, proofScope: string) {
  return generateProof(identity, new Group(commitments), hashToBigIntString(content), proofScope, 16, {
    wasm: path.join(artifactsDir, 'semaphore.wasm'),
    zkey: path.join(artifactsDir, 'semaphore_16.zkey'),
  });
}

export function toPayloadProof(proof: any) {
  return {
    merkleTreeDepth: Number(proof.merkleTreeDepth),
    merkleTreeRoot: String(proof.merkleTreeRoot),
    nullifier: String(proof.nullifier),
    message: String(proof.message),
    scope: String(proof.scope),
    points: (proof.points as any[]).map(String),
  };
}
