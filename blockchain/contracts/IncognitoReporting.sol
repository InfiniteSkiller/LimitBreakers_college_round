
 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    ISemaphore
} from "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract IncognitoReporting {
    address public owner;
    uint256 public nextTopicId = 1;

    ISemaphore public semaphore;
    uint256 public semaphoreGroupId;
    bool public semaphoreConfigured;

    struct Topic {
        string name;
        bool active;
    }

    mapping(uint256 => Topic) public topics;

    // Separate duplicate-submission tracking for each topic.
    mapping(uint256 => mapping(uint256 => bool))
        public nullifierUsed;

    event TopicCreated(uint256 indexed topicId, string name);
    event TopicStatusChanged(uint256 indexed topicId, bool active);
    event SemaphoreConfigured(address indexed semaphore, uint256 indexed groupId);
    event AnonymousSubmissionAccepted(
        uint256 indexed topicId,
        uint256 indexed nullifier
    );

    error Unauthorized();
    error InvalidTopic();
    error TopicInactive();
    error NullifierAlreadyUsed();
    error EmptyTopicName();
    error ZeroNullifier();
    error InvalidSemaphoreAddress();
    error SemaphoreNotConfigured();
    error WrongProofScope();
    error InvalidProof();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function configureSemaphore(
        address semaphoreAddress,
        uint256 groupId
    ) external onlyOwner {
        if (semaphoreAddress == address(0)) {
            revert InvalidSemaphoreAddress();
        }

        semaphore = ISemaphore(semaphoreAddress);
        semaphoreGroupId = groupId;
        semaphoreConfigured = true;

        emit SemaphoreConfigured(semaphoreAddress, groupId);
    }

    function createTopic(
        string calldata name
    ) external onlyOwner returns (uint256 topicId) {
        if (bytes(name).length == 0) revert EmptyTopicName();

        topicId = nextTopicId++;

        topics[topicId] = Topic({
            name: name,
            active: true
        });

        emit TopicCreated(topicId, name);
    }

    function setTopicActive(
        uint256 topicId,
        bool active
    ) external onlyOwner {
        if (topicId == 0 || topicId >= nextTopicId) {
            revert InvalidTopic();
        }

        topics[topicId].active = active;
        emit TopicStatusChanged(topicId, active);
    }

    function submitWithProof(
        uint256 topicId,
        ISemaphore.SemaphoreProof calldata proof
    ) external {
        if (topicId == 0 || topicId >= nextTopicId) {
            revert InvalidTopic();
        }

        if (!topics[topicId].active) revert TopicInactive();
        if (!semaphoreConfigured) revert SemaphoreNotConfigured();
        if (proof.nullifier == 0) revert ZeroNullifier();

        // The proof must be generated for this exact topic.
        if (proof.scope != topicId) revert WrongProofScope();

        if (nullifierUsed[topicId][proof.nullifier]) {
            revert NullifierAlreadyUsed();
        }

        // Verify membership and the proof's public signals on-chain.
        if (!semaphore.verifyProof(semaphoreGroupId, proof)) {
            revert InvalidProof();
        }

        nullifierUsed[topicId][proof.nullifier] = true;

        emit AnonymousSubmissionAccepted(
            topicId,
            proof.nullifier
        );
    }
}
