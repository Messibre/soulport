// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./oz/access/Ownable.sol";
import {IProofVerifier} from "./interfaces/IProofVerifier.sol";
import {ReputationStaking} from "./ReputationStaking.sol";

contract ReputationOracle is Ownable {
    struct Web2Verification {
        string platform;
        string externalId;
        bytes32 hash;
        uint256 timestamp;
    }

    struct Web3Verification {
        string[] walletActivity;
        string[] contractInteractions;
        uint256 txCount;
        uint256 txVolume;
        uint256 timestamp;
    }

    mapping(address => mapping(string => Web2Verification)) public web2Verifications;
    mapping(address => Web3Verification) public web3Verifications;
    mapping(bytes32 => address) public proofHashOwner;

    mapping(address => bool) public verifiedImporters;
    mapping(address => bool) public oracles;
    mapping(address => uint256) public web2VerificationCount;

    uint256 public maxInteractions = 200;
    uint256 public maxTxVolume = 1_000_000 ether;

    IProofVerifier public proofVerifier;
    ReputationStaking public reputationStaking;

    event ImporterUpdated(address indexed importer, bool isAllowed);
    event OracleUpdated(address indexed oracle, bool isAllowed);
    event ProofVerifierUpdated(address indexed verifier);
    event ReputationStakingUpdated(address indexed stakingContract);
    event MaxInteractionsUpdated(uint256 maxInteractions);
    event MaxTxVolumeUpdated(uint256 maxTxVolume);
    event Web2Verified(address indexed user, string platform, string externalId, bytes32 proofHash);
    event Web3Verified(address indexed user, uint256 txCount, uint256 txVolume);

    modifier onlyVerifiedImporter() {
        require(verifiedImporters[msg.sender], "Oracle: caller is not importer");
        _;
    }

    modifier onlyOracle() {
        require(oracles[msg.sender], "Oracle: caller is not oracle");
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setProofVerifier(address verifier) external onlyOwner {
        proofVerifier = IProofVerifier(verifier);
        emit ProofVerifierUpdated(verifier);
    }

    function setReputationStaking(address stakingContract) external onlyOwner {
        reputationStaking = ReputationStaking(stakingContract);
        emit ReputationStakingUpdated(stakingContract);
    }

    function setVerifiedImporter(address importer, bool isAllowed) external onlyOwner {
        verifiedImporters[importer] = isAllowed;
        emit ImporterUpdated(importer, isAllowed);
    }

    function setOracle(address oracle, bool isAllowed) external onlyOwner {
        oracles[oracle] = isAllowed;
        emit OracleUpdated(oracle, isAllowed);
    }

    function setMaxInteractions(uint256 newMaxInteractions) external onlyOwner {
        require(newMaxInteractions > 0, "Oracle: invalid max interactions");
        maxInteractions = newMaxInteractions;
        emit MaxInteractionsUpdated(newMaxInteractions);
    }

    function setMaxTxVolume(uint256 newMaxTxVolume) external onlyOwner {
        require(newMaxTxVolume > 0, "Oracle: invalid max tx volume");
        maxTxVolume = newMaxTxVolume;
        emit MaxTxVolumeUpdated(newMaxTxVolume);
    }

    function submitWeb2Proof(address user, string memory platform, string memory externalId, bytes32 proofHash)
        external
        onlyVerifiedImporter
    {
        require(user != address(0), "Oracle: invalid user");
        require(bytes(platform).length > 0, "Oracle: empty platform");
        require(bytes(externalId).length > 0, "Oracle: empty externalId");
        require(proofHash != bytes32(0), "Oracle: empty proof hash");
        require(address(proofVerifier) != address(0), "Oracle: verifier not set");
        require(proofVerifier.verifyWeb2Proof(user, platform, externalId, proofHash), "Oracle: invalid proof");

        address existingOwner = proofHashOwner[proofHash];
        require(existingOwner == address(0) || existingOwner == user, "Oracle: proof hash already used");

        Web2Verification storage existing = web2Verifications[user][platform];
        if (existing.timestamp == 0) {
            web2VerificationCount[user] += 1;
        }

        proofHashOwner[proofHash] = user;

        web2Verifications[user][platform] = Web2Verification({
            platform: platform,
            externalId: externalId,
            hash: proofHash,
            timestamp: block.timestamp
        });

        emit Web2Verified(user, platform, externalId, proofHash);
    }

    function submitWeb3Activity(address user, string[] memory interactions, uint256 txVolume)
        external
        onlyOracle
    {
        require(user != address(0), "Oracle: invalid user");
        require(interactions.length > 0, "Oracle: empty interactions");
        require(interactions.length <= maxInteractions, "Oracle: too many interactions");
        require(txVolume > 0, "Oracle: invalid tx volume");
        require(txVolume <= maxTxVolume, "Oracle: tx volume too high");

        Web3Verification storage verification = web3Verifications[user];

        delete verification.walletActivity;
        delete verification.contractInteractions;

        for (uint256 i = 0; i < interactions.length; i++) {
            verification.walletActivity.push(interactions[i]);
            verification.contractInteractions.push(interactions[i]);
        }

        verification.txCount = interactions.length;
        verification.txVolume = txVolume;
        verification.timestamp = block.timestamp;

        emit Web3Verified(user, interactions.length, txVolume);
    }

    function getCombinedReputationScore(address user) external view returns (uint256) {
        uint256 web2Score = web2VerificationCount[user] * 100;
        Web3Verification storage web3 = web3Verifications[user];
        uint256 web3Score = (web3.txCount * 10) + (web3.txVolume / 1e15);
        uint256 stakeWeight = 1e18;

        if (address(reputationStaking) != address(0)) {
            stakeWeight = reputationStaking.getReputationWeight(user);
        }

        uint256 baseScore = (web2Score + web3Score) * stakeWeight / 1e18;

        if (web3.timestamp == 0) {
            return baseScore;
        }

        uint256 age = block.timestamp - web3.timestamp;
        uint256 decayPeriods = age / 30 days;
        if (decayPeriods > 0) {
            if (decayPeriods >= 8) {
                return baseScore / 256;
            }

            return baseScore >> decayPeriods;
        }

        return baseScore;
    }

    function getWeb2Verification(address user, string memory platform)
        external
        view
        returns (Web2Verification memory)
    {
        return web2Verifications[user][platform];
    }

    function getWeb3Verification(address user) external view returns (Web3Verification memory) {
        return web3Verifications[user];
    }
}
