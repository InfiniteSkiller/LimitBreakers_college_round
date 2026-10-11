Incognito — Anonymous College Feedback & Reporting Platform
Prototype 1 · Privacy-focused college feedback with Semaphore zero-knowledge membership proofs
Incognito is a college feedback and reporting prototype intended to let eligible members submit feedback while proving group membership without revealing the secret behind their Semaphore identity. It combines a React frontend, a Fastify API, SQLite storage, privacy-risk checks, and an experimental Solidity/Semaphore contracts package.
> **Current status:** The frontend, backend and Solidity contracts are connected end to end. With the chain enabled, every report's Semaphore proof is verified by the backend **and** by the deployed `IncognitoReporting` contract, and duplicates are blocked both in SQLite and on-chain. With the chain disabled (the default) the app runs fully off-chain exactly as before. The chain path has been tested against a local Hardhat node; see [Running with the blockchain](#running-with-the-blockchain). Sepolia has not been tested yet.
What works today
Semaphore identity and proof flow: The browser creates a Semaphore identity and generates a real Semaphore v4/Groth16 proof for a report scope and message.
Server-side proof verification: The backend reconstructs a Semaphore group from enrolled commitments, checks the submitted root, validates message/scope binding, and performs cryptographic proof verification.
Duplicate prevention: SQLite enforces a unique `(scope_id, nullifier)` pair. A repeated submission within the same scope is rejected with HTTP `409`; another scope produces a different Semaphore nullifier.
Privacy-risk checks: Submitted report content is scanned for patterns such as email addresses, phone numbers, student IDs, dates, rooms, and course-code context. Findings can cause redaction or manual review.
Moderator and recipient views: The app includes moderator review and aggregated feedback views. Aggregate summaries are suppressed when fewer than three approved contributors exist in a scope. The API withholds the exact contributor count for suppressed scopes.
Experimental blockchain package: The `blockchain/` folder contains `IncognitoReporting.sol`, Semaphore deployment wrappers, an Ignition deployment module, and a local proof/contract integration test.
Important boundaries and prototype limitations
This is a prototype, not a production anonymity guarantee.
Enrollment is demo-only: The current enrollment service accepts tickets beginning with `STU` or `DEMO`; it does not verify a ticket against an authoritative college registry. Do not present this as institutional identity verification.
Enrollment records contain linkable data: SQLite stores the demo student ticket together with the public Semaphore identity commitment in the enrollment table. Report records do not store the identity secret, but the enrollment table is not anonymous from an administrator with database access.
The identity secret is stored in browser `localStorage`: This is convenient for the demo but is not the preferred storage choice for a hardened production application, especially on shared devices.
IP/network anonymity is not provided by the app: Server logs, network metadata, request timing, a user's writing, or operational correlation can reveal information. A zero-knowledge proof by itself does not hide these signals.
Threshold suppression is not differential privacy: The minimum-three-contributor rule suppresses small cohorts; it does not add calibrated statistical noise or provide a differential-privacy guarantee.
On-chain data is public: only the proof's nullifier and topic ID are written to the chain. Report text never leaves the backend, but the backend wallet pays gas and sends every transaction, so on-chain timing and the backend's IP/logs are observable. Anonymity of the *content* and *network metadata* is not provided by the chain.
The backend is a trusted relayer and group admin: one backend wallet owns `IncognitoReporting`, is admin of the Semaphore group and adds every member. Group membership is therefore only as trustworthy as the backend operator. Seeded demo reports are stored off-chain only (they predate the chain); only reports submitted while the chain is enabled have a transaction hash.
Architecture
```mermaid
flowchart TD
    Browser[React browser client\nLocal Semaphore identity\nPrivacy pre-scan + proof generation]
    API[Fastify API]
    Enrollment[SQLite enrollments\nDemo ticket + public commitment]
    Verify[Semaphore proof verification\nTrusted group root + scope/message binding]
    Nullifier[SQLite scoped nullifier guard\nUNIQUE scope_id + nullifier]
    Privacy[Privacy-risk gate]
    Reports[SQLite reports]
    Moderator[Moderator review portal]
    Dashboard[Feedback recipient dashboard\nSuppress counts below 3]
    Contracts[Solidity contracts\nSemaphore + IncognitoReporting\n(optional, CHAIN_ENABLED=true)]

    Browser -->|Enroll commitment| API
    API --> Enrollment
    Browser -->|Report + real Semaphore proof| API
    API --> Verify
    Enrollment --> Verify
    Verify --> Nullifier
    Nullifier --> Privacy
    Privacy --> Reports
    Reports --> Moderator
    Reports --> Dashboard
    API -->|"addMember / createTopic / submitWithProof"| Contracts
```
Technology stack
Frontend: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts.
Backend: Node.js, Fastify, TypeScript, SQLite via `better-sqlite3`, Zod.
Zero-knowledge: Semaphore protocol v4 packages, Groth16 proof generation/verification, `snarkjs`/WASM artifacts.
Blockchain package: Solidity, Hardhat 3, Hardhat Ignition, Viem, Semaphore contracts.
Tests: Vitest for backend integration tests; Hardhat Node.js tests for contracts.
Prerequisites
Node.js 22.x recommended for the tested setup
npm 10.x recommended
Setup and run
From the repository root:
```bash
npm run setup
```
Seed demo data if needed:
```bash
npm run seed
```
Start the frontend and backend in development mode:
```bash
npm run dev
```
The current README/configuration expects the frontend at `http://localhost:3000` and backend at port `3001`. If your local configuration differs, use the actual Vite and server startup output.
Run the backend tests:
```bash
npm test
```
Build both applications:
```bash
npm run build
```
Backend API
`POST /api/enroll`
Enrolls a public identity commitment using the current demo ticket check.
Request:
```json
{
  "studentTicket": "STU-2026-8891",
  "identityCommitment": "<decimal Semaphore identity commitment>"
}
```
The current implementation only checks that the ticket begins with `STU` or `DEMO`; it is not a real college registry verification flow.
`GET /api/group/state`
Returns the backend's current enrolled commitments, reconstructed Merkle root, and tree depth. This is currently the backend/SQLite group state, not proof that those members have already been synchronized to the blockchain group.
`POST /api/reports`
Submits a report with a real Semaphore proof object. Report content remains off-chain in SQLite.
Request shape:
```json
{
  "category": "teaching",
  "scopeId": "teaching:2026-Q4",
  "content": "Lecture slides could use more worked examples.",
  "proof": {
    "merkleTreeDepth": 16,
    "merkleTreeRoot": "<decimal Merkle root>",
    "nullifier": "<decimal nullifier>",
    "message": "<decimal message signal>",
    "scope": "<decimal scope signal>",
    "points": ["<proof coordinate values>"]
  }
}
```
Typical responses:
`201 Created` — proof accepted; report stored and classified.
`400 Bad Request` — malformed payload or invalid category/scope relationship.
`401 Unauthorized` — proof, scope, message, or group-root verification failed.
`409 Conflict` — duplicate nullifier already used for that scope (detected in SQLite or by the contract).
`502 Bad Gateway` — chain enabled but unreachable; nothing was saved, the user can retry.

When the chain is enabled the proof's `scope` **must be the on-chain topic ID** returned by `GET /api/topics/resolve`, not a hash of the scope string. The `201` response then includes `txHash` and `topicId`.
`GET /api/topics/resolve?scopeId=teaching:2026-Q4`
Returns `{ scopeId, topicId, proofScope }`. `proofScope` is the exact value to pass as the proof scope. With the chain on, the topic is created on-chain the first time a scope is requested. The public prototype resolver restricts creation to the `ALLOWED_CATEGORIES` and `ALLOWED_PERIODS` lists in `server/.env`; defaults match the current UI (`2026-Q3`, `2026-Q4`, `2026-10`). This finite list bounds topic creation, but a public deployment should move topic creation behind moderator authorization.
`GET /api/chain/status`
Returns the contract addresses, group id, on-chain member count and root, the backend root, and `inSync`.
`GET /api/admin/reports`
Retrieves reports for authorized moderators. Check `server/src/routes/admin.ts` for the current demo authentication configuration. Replace any demo/static credentials before deploying outside a local demonstration.
`PATCH /api/admin/reports/:id`
Updates a report's review status and optionally its sanitized content.
`GET /api/feedback/summary`
Returns grouped feedback summaries. Results are suppressed when fewer than three approved contributors exist in a category/scope.
`GET /api/health`
Returns backend health status.
> The old `/api/verification/demo` simulated-proof endpoint is no longer part of the current server route setup. The current report API accepts a full Semaphore proof object instead of the old `proofToken`/`nullifier` demonstration payload.
Blockchain package status
The `blockchain/` directory contains:
`contracts/IncognitoReporting.sol` — topic management, Semaphore proof verification, and per-topic nullifier reuse protection.
`contracts/SemaphoreVerifierDeployable.sol` and `contracts/SemaphoreDeployable.sol` — deployable Semaphore wrappers.
`ignition/modules/Incognito.ts` — deploys PoseidonT3, the Semaphore verifier, Semaphore, and IncognitoReporting.
`test/SemaphoreIntegration.ts` — local test intended to deploy contracts, generate a genuine proof, submit it, and verify on-chain nullifier tracking.
From the blockchain folder, use:
```bash
cd blockchain
npm ci
npx hardhat compile
npx hardhat test nodejs
```
Running with the blockchain
Everything below was run against a local Hardhat node. Use three terminals.

1. Start a local chain (terminal 1, in `blockchain/`):
```bash
npx hardhat node
```
2. Deploy and configure everything in one step (terminal 2, in `blockchain/`):
```bash
npx hardhat run scripts/deploy-and-configure.ts --network localhost
```
This deploys PoseidonT3, the verifier, Semaphore and `IncognitoReporting`, creates the Semaphore group, calls `configureSemaphore`, and writes `blockchain/deployments/localhost.json`. (The Ignition module only deploys; it does not create the group or configure the contract, so use the script.)

3. Configure and start the backend (terminal 3). Copy the addresses the script printed into `server/.env`:
```
CHAIN_ENABLED=true
CHAIN_RPC_URL=http://127.0.0.1:8545
CHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # Hardhat's public account #0, LOCAL ONLY
SEMAPHORE_ADDRESS=<from deployments/localhost.json>
REPORTING_ADDRESS=<from deployments/localhost.json>
SEMAPHORE_GROUP_ID=0
```
```bash
npm run dev
```
On startup the backend checks it owns the contracts, adds any already-enrolled members to the on-chain group (this includes the seeded demo students), and refuses to start if the roots differ.

`CHAIN_PRIVATE_KEY` must be the **same wallet that deployed**, because that wallet is the group admin and contract owner. Restarting `hardhat node` wipes the chain: redeploy, update the addresses, and reset `server/incognito.db` (or the startup sync will report the out-of-sync group).

Sepolia (untested): set `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY` (environment variables or the Hardhat keystore), fund the wallet with Sepolia ETH, run the deploy script with `--network sepolia`, and put the same key in `CHAIN_PRIVATE_KEY`. Never commit a real private key.

Running the tests
```bash
# Contracts
cd blockchain && npx hardhat test nodejs

# Backend, off-chain + fake-chain logic (no node needed)
cd server && npx vitest run

# Real end-to-end against a fresh local deployment (steps 1 and 2 above, then):
cd server && CHAIN_ENABLED=true CHAIN_RPC_URL=... CHAIN_PRIVATE_KEY=... SEMAPHORE_ADDRESS=... REPORTING_ADDRESS=... SEMAPHORE_GROUP_ID=0 npx vitest run tests/chain.e2e.test.ts
```
The end-to-end test needs a freshly deployed (empty) group each run. Without `CHAIN_ENABLED=true` it is skipped.

Frontend review notes
The report submission page has a sensible sequence: local identity, demo enrollment, category/period selection, privacy pre-scan, proof generation, then report submission. Before production, consider these improvements:
Replace wording such as “Zero identity linkage” with a qualified claim explaining that the proof hides the identity secret but does not hide network metadata or operational correlation.
Clearly label the student ticket as a demo eligibility check.
Avoid displaying sensitive secret material; store browser identity data with a security model suitable for the intended deployment.
`client/src/workers/zkProofWorker.ts` exists, but `SubmitReportPage.tsx` currently imports and calls `generateProof` directly. If the worker is intended to offload proof generation, wire it into the page and test the worker path.
The success card shows the transaction hash only when the backend returns one, i.e. after the contract transaction was confirmed.
Test status
Last reported local results during development:
Backend: 11/11 Vitest tests passing, including real Semaphore proof acceptance/rejection, altered proof rejection, message binding, scoped nullifier duplicate protection, concurrent duplicate handling, privacy checks, moderator authorization, and report identity-leak checks.
Production build: Backend TypeScript and frontend TypeScript/Vite build completed successfully. Vite emitted a large-chunk optimization warning; it did not fail the build.
Blockchain-backed flow: 11 fake-chain tests and 9 real end-to-end tests (enrollment, startup sync, topic-scoped proof verified by the real contract, duplicate rejection, second topic, tampered proof, legacy scope, inactive topic with retry, stale root) pass against a local Hardhat node. Re-run the commands above after pulling to confirm your checkout.
Privacy and security statement
Incognito demonstrates zero-knowledge membership proofs and scope-specific nullifiers in a prototype. It does not, by itself, guarantee that a reporter cannot be identified. For a production deployment, the team must add authoritative eligibility verification, protect enrollment records, secure identity-secret handling, review logs and network metadata, configure robust authentication, synchronize contract state, and conduct a security review.
License
MIT License (see the repository license file, if included).