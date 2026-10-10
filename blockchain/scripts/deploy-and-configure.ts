import { network } from "hardhat";

async function main() {
  console.log("🚀 Deploying Incognito contracts...");

  const connection = await network.create();
  const { viem } = connection;
  const [deployer] = await viem.getWalletClients();

  console.log("Deployer address:", deployer.account.address);

  // 1. Deploy PoseidonT3 library
  console.log("📦 Deploying PoseidonT3 library...");
  const poseidon = await viem.deployContract("PoseidonT3");
  console.log("   PoseidonT3 deployed to:", poseidon.address);

  // 2. Deploy SemaphoreVerifierDeployable
  console.log("📦 Deploying SemaphoreVerifierDeployable...");
  const verifier = await viem.deployContract("SemaphoreVerifierDeployable");
  console.log("   SemaphoreVerifier deployed to:", verifier.address);

  // 3. Deploy SemaphoreDeployable linked with PoseidonT3
  console.log("📦 Deploying SemaphoreDeployable...");
  const semaphore = await viem.deployContract(
    "SemaphoreDeployable",
    [verifier.address],
    {
      libraries: {
        PoseidonT3: poseidon.address,
      },
    }
  );
  console.log("   Semaphore deployed to:", semaphore.address);

  // 4. Create initial group
  console.log("👥 Creating Semaphore group...");
  const groupCounterBefore = await semaphore.read.groupCounter();
  await semaphore.write.createGroup();
  const groupId = groupCounterBefore;
  console.log("   Semaphore Group ID created:", groupId.toString());

  // 5. Deploy IncognitoReporting
  console.log("📦 Deploying IncognitoReporting...");
  const reporting = await viem.deployContract("IncognitoReporting");
  console.log("   IncognitoReporting deployed to:", reporting.address);

  // 6. Configure Semaphore in IncognitoReporting
  console.log("⚙️  Configuring IncognitoReporting with Semaphore...");
  await reporting.write.configureSemaphore([semaphore.address, groupId]);
  console.log("   Semaphore configured in IncognitoReporting!");

  // 7. Seed standard topics
  console.log("🏷️  Pre-creating default feedback topics...");
  const initialTopics = [
    "teaching:2026-Q4",
    "facilities:2026-Q4",
    "curriculum:2026-Q4",
    "hostel:2026-Q4",
    "general:2026-Q4",
  ];

  for (const topicName of initialTopics) {
    await reporting.write.createTopic([topicName]);
    console.log(`   Created topic: ${topicName}`);
  }

  console.log("\n========================================================");
  console.log("🎉 DEPLOYMENT COMPLETE!");
  console.log("========================================================");
  console.log("Add the following environment variables to your server .env:");
  console.log(`SEMAPHORE_CONTRACT_ADDRESS=${semaphore.address}`);
  console.log(`REPORTING_CONTRACT_ADDRESS=${reporting.address}`);
  console.log(`SEMAPHORE_GROUP_ID=${groupId.toString()}`);
  console.log("========================================================\n");

  await connection.close();
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
