
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@semaphore-protocol/contracts/Semaphore.sol";
import "@semaphore-protocol/contracts/interfaces/ISemaphoreVerifier.sol";

contract SemaphoreDeployable is Semaphore {
    constructor(ISemaphoreVerifier verifier_)
        Semaphore(verifier_)
    {}
}
