
import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";

describe("IncognitoReporting", async function () {
    const connection = await network.create();
    const { viem } = connection;

    after(async () => {
        await connection.close();
    });

    async function deployFixture() {

        const [owner, outsider] = await viem.getWalletClients();

        const deployed = await viem.deployContract("IncognitoReporting");

        const contract = await viem.getContractAt(
            "IncognitoReporting",
            deployed.address
        );

        return { owner, outsider, contract };
    }

    // Struct-shaped placeholder for tests that should revert
    // before the contract attempts to verify a proof.
    const dummyProof = {
        merkleTreeDepth: 0n,
        merkleTreeRoot: 0n,
        nullifier: 12345n,
        message: 0n,
        scope: 1n,
        points: [
            0n, 0n, 0n, 0n,
            0n, 0n, 0n, 0n
        ] as const
    };

    const nonzeroAddress =
        "0x0000000000000000000000000000000000000001" as const;

    it("assigns the deployer as owner", async function () {
        const { owner, contract } = await deployFixture();

        assert.equal(
            (await contract.read.owner()).toLowerCase(),
            owner.account.address.toLowerCase()
        );
    });

    it("allows the owner to create a topic", async function () {
        const { contract } = await deployFixture();

        await contract.write.createTopic(["Faculty Feedback"]);

        const topic = await contract.read.topics([1n]);

        assert.equal(topic[0], "Faculty Feedback");
        assert.equal(topic[1], true);
        assert.equal(await contract.read.nextTopicId(), 2n);
    });

    it("rejects topic creation by an unauthorized account", async function () {
        const { outsider, contract } = await deployFixture();

        const outsiderContract = await viem.getContractAt(
            "IncognitoReporting",
            contract.address,
            { client: { wallet: outsider } }
        );

        await assert.rejects(
            outsiderContract.write.createTopic(["Unauthorized Topic"])
        );
    });

    it("rejects an empty topic name", async function () {
        const { contract } = await deployFixture();

        await assert.rejects(contract.write.createTopic([""]));
    });

    it("rejects submissions when Semaphore is not configured", async function () {
        const { contract } = await deployFixture();

        await contract.write.createTopic(["Faculty Feedback"]);

        await assert.rejects(
            contract.write.submitWithProof([1n, dummyProof])
        );
    });

    it("rejects submissions to inactive topics", async function () {
        const { contract } = await deployFixture();

        await contract.write.createTopic(["Faculty Feedback"]);
        await contract.write.setTopicActive([1n, false]);

        // Inactive-topic validation occurs before proof verification.
        await assert.rejects(
            contract.write.submitWithProof([1n, dummyProof])
        );
    });

    it("rejects a zero nullifier", async function () {
        const { contract } = await deployFixture();

        await contract.write.createTopic(["Faculty Feedback"]);

        await contract.write.configureSemaphore([
            nonzeroAddress,
            1n
        ]);

        const zeroNullifierProof = {
            ...dummyProof,
            nullifier: 0n
        };

        // Zero-nullifier validation occurs before the external call.
        await assert.rejects(
            contract.write.submitWithProof([1n, zeroNullifierProof])
        );
    });

    it("rejects a proof with the wrong topic scope", async function () {
        const { contract } = await deployFixture();

        await contract.write.createTopic(["Faculty Feedback"]);

        await contract.write.configureSemaphore([
            nonzeroAddress,
            1n
        ]);

        await assert.rejects(
            contract.write.submitWithProof([
                1n,
                { ...dummyProof, scope: 2n }
            ])
        );
    });

    it("rejects a nonexistent topic", async function () {
        const { contract } = await deployFixture();

        await assert.rejects(
            contract.write.submitWithProof([999n, dummyProof])
        );
    });
});
