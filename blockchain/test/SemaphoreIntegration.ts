
import { before, after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { Identity } from "@semaphore-protocol/identity";
import { Group } from "@semaphore-protocol/group";
import { generateProof } from "@semaphore-protocol/proof";

type Connection = Awaited<ReturnType<typeof network.create>>;

describe("Incognito Semaphore integration", function () {
    let connection: Connection | undefined;

    before(async () => {
        connection = await network.create();
    });

    after(async () => {
        console.log("[Semaphore] Closing network connection...");
        await connection?.close();
        console.log("[Semaphore] Network connection closed.");

        // snarkjs/ffjavascript keeps worker threads alive after proving
        const curve = (globalThis as any).curve_bn128;
        if (curve?.terminate) {
            await curve.terminate();
        }
    });

    it("deploys Semaphore and accepts a genuine membership proof", async function () {
        const currentConnection = connection;

        if (!currentConnection) {
            throw new Error("Hardhat network connection was not initialized.");
        }

        const { viem } = currentConnection;


        // Deploy the Poseidon library.
        const poseidon = await viem.deployContract("PoseidonT3");

        // Deploy the Semaphore proof verifier.
        const verifier = await viem.deployContract(
            "SemaphoreVerifierDeployable"
        );


        // Keep the rest of your existing test body here,
        // starting with deployment of PoseidonT3.


        // 3. Deploy Semaphore, linking PoseidonT3.
        const semaphore = await viem.deployContract(
            "SemaphoreDeployable",
            [verifier.address],
            {
                libraries: {
                    PoseidonT3: poseidon.address
                }
            }
        );

        // 4. Deploy the reporting contract.
        const reporting = await viem.deployContract(
            "IncognitoReporting"
        );

        // 5. Create a real Semaphore identity and group.
        const identity = new Identity();
        const groupId = await semaphore.read.groupCounter();

        await semaphore.write.createGroup();
        await semaphore.write.addMember([
            groupId,
            BigInt(identity.commitment.toString())
        ]);

        // 6. Configure reporting and create a topic.
        await reporting.write.configureSemaphore([
            semaphore.address,
            groupId
        ]);

        await reporting.write.createTopic(["Faculty Feedback"]);

        // 7. Generate a genuine proof for topic 1.
        const topicId = 1n;
        const proof = await generateProof(
            identity,
            new Group([
                BigInt(identity.commitment.toString())
            ]),
            0n,
            topicId
        );

        // 8. Submit the proof on-chain.
        const solidityProof = {
            merkleTreeDepth: BigInt(proof.merkleTreeDepth),
            merkleTreeRoot: BigInt(proof.merkleTreeRoot),
            nullifier: BigInt(proof.nullifier),
            message: BigInt(proof.message),
            scope: BigInt(proof.scope),
            points: proof.points.map(BigInt) as [
                bigint, bigint, bigint, bigint,
                bigint, bigint, bigint, bigint
            ]
        };

        await reporting.write.submitWithProof([
            topicId,
            solidityProof
        ]);

        // 9. Confirm the topic-scoped nullifier was recorded.
        assert.equal(
            await reporting.read.nullifierUsed([
                topicId,
                solidityProof.nullifier
            ]),
            true
        );

        // 10. The same identity cannot submit twice to this topic.
        await assert.rejects(
            reporting.write.submitWithProof([
                topicId,
                solidityProof
            ])
        );
    });

});
