
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const IncognitoModule = buildModule("IncognitoModule", (m) => {
    // Deploy the Poseidon library required by Semaphore.
    const poseidon = m.library("PoseidonT3");

    // Deploy Semaphore's proof verifier.
    const verifier = m.contract("SemaphoreVerifierDeployable");

    // Link PoseidonT3 when deploying Semaphore.
    const semaphore = m.contract(
        "SemaphoreDeployable",
        [verifier],
        {
            libraries: {
                PoseidonT3: poseidon,
            },
        }
    );

    // Deploy the reporting contract.
    const reporting = m.contract("IncognitoReporting");

    return {
        poseidon,
        verifier,
        semaphore,
        reporting,
    };
});

export default IncognitoModule;
