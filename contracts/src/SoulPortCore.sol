// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./oz/access/Ownable.sol";
import {Pausable} from "./oz/utils/Pausable.sol";

import {SchemaRegistry} from "./SchemaRegistry.sol";
import {SoulPortSBT} from "./SoulPortSBT.sol";
import {ReputationStaking} from "./ReputationStaking.sol";
import {ReputationOracle} from "./ReputationOracle.sol";
import {IEASAttester} from "./interfaces/IEASAttester.sol";

contract SoulPortCore is Ownable, Pausable {
    SchemaRegistry public immutable schemaRegistry;
    SoulPortSBT public immutable soulPortSBT;
    ReputationStaking public immutable reputationStaking;
    ReputationOracle public immutable reputationOracle;
    IEASAttester public immutable easAttester;

    mapping(address => bytes32) public lastAttestationUID;
    uint256 public attestationNonce;

    event AttestationAndMintCreated(
        address indexed user,
        bytes32 indexed attestationUID,
        uint256 indexed tokenId,
        uint256 amount,
        string platform,
        uint256 txVolume
    );

    constructor(
        address schemaRegistryAddress,
        address sbtAddress,
        address stakingAddress,
        address oracleAddress,
        address attesterAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        require(schemaRegistryAddress != address(0), "Core: invalid schemaRegistry");
        require(sbtAddress != address(0), "Core: invalid sbt");
        require(stakingAddress != address(0), "Core: invalid staking");
        require(oracleAddress != address(0), "Core: invalid oracle");
        require(attesterAddress != address(0), "Core: invalid attester");

        schemaRegistry = SchemaRegistry(schemaRegistryAddress);
        soulPortSBT = SoulPortSBT(sbtAddress);
        reputationStaking = ReputationStaking(stakingAddress);
        reputationOracle = ReputationOracle(oracleAddress);
        easAttester = IEASAttester(attesterAddress);
    }

    function createAttestationAndMint(
        address user,
        uint256 tokenId,
        uint256 amount,
        bytes memory data,
        string memory platform,
        string memory externalId,
        bytes32 proofHash,
        string[] memory interactions,
        uint256 txVolume
    ) external whenNotPaused onlyOwner returns (bytes32 attestationUID) {
        require(user != address(0), "Core: invalid user");
        require(schemaRegistry.skillSchemaUID() != bytes32(0), "Core: schema not registered");

        bytes memory attestationData = abi.encode(
            user,
            tokenId,
            amount,
            platform,
            externalId,
            proofHash,
            interactions,
            txVolume,
            block.chainid,
            attestationNonce
        );

        IEASAttester.AttestationRequestData memory requestData = IEASAttester.AttestationRequestData({
            recipient: user,
            expirationTime: 0,
            revocable: true,
            refUID: bytes32(0),
            data: attestationData,
            value: 0
        });
        IEASAttester.AttestationRequest memory request = IEASAttester.AttestationRequest({
            schema: schemaRegistry.skillSchemaUID(),
            data: requestData
        });

        attestationUID = easAttester.attest(request);

        attestationNonce += 1;
        lastAttestationUID[user] = attestationUID;

        reputationOracle.submitWeb2Proof(user, platform, externalId, proofHash);
        reputationOracle.submitWeb3Activity(user, interactions, txVolume);
        soulPortSBT.mint(user, tokenId, amount, data);

        emit AttestationAndMintCreated(user, attestationUID, tokenId, amount, platform, txVolume);
    }

    function getFullProfile(address user)
        external
        view
        returns (
            bytes32 attestationUID,
            uint256 reputationScore,
            uint256 stakedAmount,
            uint256 stakeUnlockTimestamp,
            uint256 web2Count,
            uint256 txCount,
            uint256 txVolume
        )
    {
        attestationUID = lastAttestationUID[user];
        reputationScore = reputationOracle.getCombinedReputationScore(user);

        uint256 stakedAt;
        uint256 lockPeriod;
        (stakedAmount, stakedAt, lockPeriod) = reputationStaking.stakingInfo(user);
        if (stakedAmount > 0) {
            stakeUnlockTimestamp = stakedAt + lockPeriod;
        }

        web2Count = reputationOracle.web2VerificationCount(user);

        ReputationOracle.Web3Verification memory web3 = reputationOracle.getWeb3Verification(user);
        txCount = web3.txCount;
        txVolume = web3.txVolume;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
