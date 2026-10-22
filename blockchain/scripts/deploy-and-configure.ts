/**
 * Deploys the full Incognito on-chain stack and configures it, in one step:
 *
 *   1. PoseidonT3 library
 *   2. SemaphoreVerifierDeployable
 *   3. SemaphoreDeployable (linked to PoseidonT3)
 *   4. IncognitoReporting
 *   5. Creates the Semaphore group (the deployer becomes group admin)
 *   6. IncognitoReporting.configureSemaphore(semaphore, groupId)
 *
 * The deployer wallet becomes BOTH the Semaphore group admin and the
 * IncognitoReporting owner. The backend must use the SAME key
 * (CHAIN_PRIVATE_KEY) because it adds members and creates topics.
 *
 * Usage:
 *   npx hardhat node                                              (terminal 1)
 *   npx hardhat run scripts/deploy-and-configure.ts --network localhost   (terminal 2)
 *
 *   npx hardhat run scripts/deploy-and-configure.ts --network sepolia
 *     (needs SEPOLIA_RPC_URL and SEPOLIA_PRIVATE_KEY, see README)
 *
 * Output: deployments/<network>.json plus ready-to-paste server env lines.
 */
import fs from "node:fs";
import path from "node:path";
import { network } from "hardhat";

async function main() {
    const connection = await network.connect();
    const { viem } = connection;

    const publicClient = await viem.getPublicClient();
    const [deployer] = await viem.getWalletClients();
    const chainId = await publicClient.getChainId();

    console.log(`Network:  ${connection.networkName} (chainId ${chainId})`);
    console.log(`Deployer: ${deployer.account.address}`);

    const poseidon = await viem.deployContract("PoseidonT3");
    const verifier = await viem.deployContract("SemaphoreVerifierDeployable");
    const semaphore = await viem.deployContract(
        "SemaphoreDeployable",
        [verifier.address],
        { libraries: { PoseidonT3: poseidon.address } }
    );
    const reporting = await viem.deployContract("IncognitoReporting");

    // The first group created gets the current groupCounter as its id.
    const groupId = await semaphore.read.groupCounter();
    await publicClient.waitForTransactionReceipt({
        hash: await semaphore.write.createGroup(),
    });

    await publicClient.waitForTransactionReceipt({
        hash: await reporting.write.configureSemaphore([
            semaphore.address,
            groupId,
        ]),
    });

    // Sanity checks so a broken deployment fails loudly here, not in the demo.
    const configured = await reporting.read.semaphoreConfigured();
    const admin = await semaphore.read.getGroupAdmin([groupId]);
    if (!configured) throw new Error("Reporting contract was not configured");
    if (admin.toLowerCase() !== deployer.account.address.toLowerCase()) {
        throw new Error("Deployer is not the Semaphore group admin");
    }

    const out = {
        network: connection.networkName,
        chainId,
        deployer: deployer.account.address,
        poseidon: poseidon.address,
        verifier: verifier.address,
        semaphore: semaphore.address,
        reporting: reporting.address,
        groupId: groupId.toString(),
    };

    const dir = path.resolve("deployments");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${connection.networkName}.json`);
    fs.writeFileSync(file, JSON.stringify(out, null, 2));

    console.log(`\nDeployed and configured. Saved to ${file}\n`);
    console.log("Paste into server/.env:\n");
    console.log("CHAIN_ENABLED=true");
    console.log("CHAIN_RPC_URL=<your RPC url>");
    console.log("CHAIN_PRIVATE_KEY=<SAME key as the deployer>");
    console.log(`SEMAPHORE_ADDRESS=${out.semaphore}`);
    console.log(`REPORTING_ADDRESS=${out.reporting}`);
    console.log(`SEMAPHORE_GROUP_ID=${out.groupId}`);
}

main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
});
