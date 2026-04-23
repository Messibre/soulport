// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {SchemaRegistry} from "../src/SchemaRegistry.sol";
import {SoulPortSBT} from "../src/SoulPortSBT.sol";
import {ReputationStaking} from "../src/ReputationStaking.sol";
import {ReputationOracle} from "../src/ReputationOracle.sol";
import {SoulPortCore} from "../src/SoulPortCore.sol";
import {ISchemaRegistry} from "../src/interfaces/eas/ISchemaRegistry.sol";
import {IProofVerifier} from "../src/interfaces/IProofVerifier.sol";
import {IEASAttester} from "../src/interfaces/IEASAttester.sol";

contract SoulPortTest is Test {
    address private owner = makeAddr("owner");
    address private user = makeAddr("user");
    address private client = makeAddr("client");

    MockSchemaRegistry private mockEas;
    MockProofVerifier private proofVerifier;
    MockAttester private attester;
    SchemaRegistry private schemaRegistry;
    SoulPortSBT private sbt;
    ReputationStaking private staking;
    ReputationOracle private oracle;
    SoulPortCore private core;

    function setUp() public {
        vm.prank(owner);
        mockEas = new MockSchemaRegistry();
        proofVerifier = new MockProofVerifier();
        attester = new MockAttester();

        vm.startPrank(owner);
        schemaRegistry = new SchemaRegistry(address(mockEas), owner);
        sbt = new SoulPortSBT(owner);
        staking = new ReputationStaking(owner);
        oracle = new ReputationOracle(owner);
        oracle.setProofVerifier(address(proofVerifier));
        oracle.setReputationStaking(address(staking));
        staking.setTreasury(client);
        staking.setSlasher(owner, true);

        core = new SoulPortCore(
            address(schemaRegistry),
            address(sbt),
            address(staking),
            address(oracle),
            address(attester),
            owner
        );
        oracle.setVerifiedImporter(address(core), true);
        oracle.setOracle(address(core), true);
        sbt.transferOwnership(address(core));
        staking.transferOwnership(address(core));

        schemaRegistry.registerReviewSchema();
        schemaRegistry.registerSkillSchema();
        schemaRegistry.registerWorkHistorySchema();
        vm.stopPrank();
    }

    function testRegisterSchemas() public {
        vm.startPrank(owner);

        bytes32 reviewUid = schemaRegistry.registerReviewSchema();
        bytes32 skillUid = schemaRegistry.registerSkillSchema();
        bytes32 workUid = schemaRegistry.registerWorkHistorySchema();

        vm.stopPrank();

        assertEq(schemaRegistry.reviewSchemaUID(), reviewUid);
        assertEq(schemaRegistry.skillSchemaUID(), skillUid);
        assertEq(schemaRegistry.workHistorySchemaUID(), workUid);
    }

    function testSBTMintAndSoulboundRevert() public {
        string[] memory interactions = new string[](2);
        interactions[0] = "Uniswap";
        interactions[1] = "Aave";

        vm.prank(owner);
        core.createAttestationAndMint(
            user,
            1,
            1,
            "",
            "linkedin",
            "user-123",
            keccak256("proof"),
            interactions,
            4 ether
        );

        assertEq(sbt.balanceOf(user, 1), 1);

        vm.prank(user);
        vm.expectRevert(bytes("Soulbound: Cannot transfer"));
        sbt.safeTransferFrom(user, client, 1, 1, "");
    }

    function testStakeAndUnstakeAfterLock() public {
        vm.deal(user, 10 ether);

        vm.prank(user);
        staking.stake{value: 2 ether}(2 ether, 7);

        (uint256 amount, uint256 timestamp, uint256 lockPeriod) = staking.stakingInfo(user);
        assertEq(amount, 2 ether);
        assertEq(lockPeriod, 7 days);
        assertEq(timestamp, block.timestamp);

        vm.prank(user);
        vm.expectRevert(bytes("Staking: lock period active"));
        staking.unstake();

        vm.warp(block.timestamp + 8 days);

        uint256 beforeBalance = user.balance;
        vm.prank(user);
        staking.unstake();
        uint256 afterBalance = user.balance;

        assertEq(afterBalance - beforeBalance, 2 ether);
        (amount,,) = staking.stakingInfo(user);
        assertEq(amount, 0);
    }

    function testSlashByOwner() public {
        vm.deal(user, 5 ether);

        vm.prank(user);
        staking.stake{value: 3 ether}(3 ether, 5);

        uint256 clientBalanceBefore = client.balance;

        vm.prank(owner);
        staking.slash(user, 75e16);

        uint256 clientBalanceAfter = client.balance;
        assertEq(clientBalanceAfter - clientBalanceBefore, 75e16);

        (uint256 amount,,) = staking.stakingInfo(user);
        assertEq(amount, 225e16);
    }

    function testReputationWeightTiers() public {
        vm.deal(user, 12 ether);

        vm.prank(user);
        staking.stake{value: 1 ether}(1 ether, 30);
        assertEq(staking.getReputationWeight(user), 12e17);

        vm.prank(user);
        staking.stake{value: 4 ether}(4 ether, 30);
        assertEq(staking.getReputationWeight(user), 15e17);

        vm.prank(user);
        staking.stake{value: 5 ether}(5 ether, 30);
        assertEq(staking.getReputationWeight(user), 2e18);
    }

    function testOracleOnlyRoleRestrictions() public {
        vm.expectRevert(bytes("Oracle: caller is not importer"));
        oracle.submitWeb2Proof(user, "linkedin", "abc", keccak256("x"));

        string[] memory interactions = new string[](1);
        interactions[0] = "Lido";

        vm.expectRevert(bytes("Oracle: caller is not oracle"));
        oracle.submitWeb3Activity(user, interactions, 1 ether);
    }

    function testFullIntegrationFlowAndProfileRead() public {
        vm.deal(user, 3 ether);

        vm.prank(user);
        staking.stake{value: 2 ether}(2 ether, 10);

        string[] memory interactions = new string[](3);
        interactions[0] = "Uniswap";
        interactions[1] = "Aave";
        interactions[2] = "Compound";

        vm.prank(owner);
        bytes32 uid = core.createAttestationAndMint(
            user,
            100,
            1,
            "",
            "linkedin",
            "freelancer-42",
            keccak256("linkedin-proof"),
            interactions,
            7 ether
        );

        assertTrue(uid != bytes32(0));
        assertEq(attester.lastRecipient(), user);
        assertEq(attester.lastSchema(), schemaRegistry.skillSchemaUID());
        assertEq(sbt.balanceOf(user, 100), 1);

        (
            bytes32 attestationUID,
            uint256 reputationScore,
            uint256 stakedAmount,
            uint256 unlockTs,
            uint256 web2Count,
            uint256 txCount,
            uint256 txVolume
        ) = core.getFullProfile(user);

        assertEq(attestationUID, uid);
        assertTrue(reputationScore > 0);
        assertEq(stakedAmount, 2 ether);
        assertEq(unlockTs, block.timestamp + 10 days);
        assertEq(web2Count, 1);
        assertEq(txCount, 3);
        assertEq(txVolume, 7 ether);
    }

    function testWeb2ProofMustBeVerified() public {
        vm.prank(owner);
        oracle.setProofVerifier(address(0));

        vm.prank(owner);
        oracle.setVerifiedImporter(owner, true);

        vm.prank(owner);
        vm.expectRevert(bytes("Oracle: verifier not set"));
        oracle.submitWeb2Proof(user, "linkedin", "abc", keccak256("x"));
    }

    function testOracleRejectsInvalidProof() public {
        vm.prank(owner);
        proofVerifier.setAllowed(false);

        vm.prank(owner);
        oracle.setVerifiedImporter(owner, true);

        vm.prank(owner);
        vm.expectRevert(bytes("Oracle: invalid proof"));
        oracle.submitWeb2Proof(user, "linkedin", "abc", keccak256("x"));
    }

    function testSlashingIsCappedAndGoesToTreasury() public {
        vm.deal(user, 10 ether);

        vm.prank(user);
        staking.stake{value: 4 ether}(4 ether, 10);

        vm.prank(owner);
        vm.expectRevert(bytes("Staking: slash exceeds cap"));
        staking.slash(user, 2 ether);

        uint256 treasuryBalanceBefore = client.balance;

        vm.prank(owner);
        staking.slash(user, 1 ether);

        assertEq(client.balance - treasuryBalanceBefore, 1 ether);
    }

    function testReputationScoreDecaysAndUsesStakeWeight() public {
        vm.deal(user, 5 ether);

        vm.prank(user);
        staking.stake{value: 1 ether}(1 ether, 10);

        string[] memory interactions = new string[](1);
        interactions[0] = "Aave";

        vm.prank(owner);
        core.createAttestationAndMint(
            user,
            7,
            1,
            "",
            "linkedin",
            "score-user",
            keccak256("proof-score"),
            interactions,
            5 ether
        );

        (, uint256 freshScore,, , , ,) = core.getFullProfile(user);
        vm.warp(block.timestamp + 31 days);
        (, uint256 decayedScore,, , , ,) = core.getFullProfile(user);

        assertGt(freshScore, decayedScore);
    }

    function testEdgeCasesZeroAddressAndInvalidStake() public {
        vm.prank(owner);
        vm.expectRevert(bytes("Core: invalid user"));
        core.createAttestationAndMint(
            address(0),
            1,
            1,
            "",
            "linkedin",
            "id",
            keccak256("proof"),
            new string[](0),
            0
        );

        vm.prank(user);
        vm.expectRevert(bytes("Staking: amount must be > 0"));
        staking.stake{value: 0}(0, 5);
    }

    function testDoubleMintAllowedForBadges() public {
        string[] memory interactions = new string[](1);
        interactions[0] = "Curve";

        vm.startPrank(owner);
        core.createAttestationAndMint(
            user,
            9,
            1,
            "",
            "linkedin",
            "user-double",
            keccak256("proof-1"),
            interactions,
            1 ether
        );
        core.createAttestationAndMint(
            user,
            9,
            1,
            "",
            "linkedin",
            "user-double",
            keccak256("proof-2"),
            interactions,
            2 ether
        );
        vm.stopPrank();

        assertEq(sbt.balanceOf(user, 9), 2);
    }

    function testCorePauseBlocksAttestationMint() public {
        vm.prank(owner);
        core.pause();

        vm.prank(owner);
        vm.expectRevert(bytes("Pausable: paused"));
        core.createAttestationAndMint(
            user,
            10,
            1,
            "",
            "linkedin",
            "paused-user",
            keccak256("paused-proof"),
            new string[](1),
            1 ether
        );
    }

    function testCoreOnlyOwnerCanMintAttestation() public {
        string[] memory interactions = new string[](1);
        interactions[0] = "Aave";

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        core.createAttestationAndMint(
            user,
            11,
            1,
            "",
            "linkedin",
            "not-owner",
            keccak256("proof-not-owner"),
            interactions,
            1 ether
        );
    }

    function testCoreRequiresRegisteredSkillSchema() public {
        vm.startPrank(owner);

        SchemaRegistry localSchemaRegistry = new SchemaRegistry(address(mockEas), owner);
        SoulPortSBT localSbt = new SoulPortSBT(owner);
        ReputationStaking localStaking = new ReputationStaking(owner);
        ReputationOracle localOracle = new ReputationOracle(owner);
        localOracle.setProofVerifier(address(proofVerifier));
        localOracle.setReputationStaking(address(localStaking));
        localStaking.setTreasury(client);

        SoulPortCore localCore = new SoulPortCore(
            address(localSchemaRegistry),
            address(localSbt),
            address(localStaking),
            address(localOracle),
            address(attester),
            owner
        );
        localOracle.setVerifiedImporter(address(localCore), true);
        localOracle.setOracle(address(localCore), true);
        localSbt.transferOwnership(address(localCore));
        localStaking.transferOwnership(address(localCore));

        vm.expectRevert(bytes("Core: schema not registered"));
        localCore.createAttestationAndMint(
            user,
            12,
            1,
            "",
            "linkedin",
            "missing-schema",
            keccak256("schema-proof"),
            new string[](1),
            1 ether
        );

        vm.stopPrank();
    }

    function testSbtSetUriAndRead() public {
        vm.prank(owner);
        SoulPortSBT localSbt = new SoulPortSBT(owner);

        vm.prank(owner);
        localSbt.setURI(42, "ipfs://soulport/42");

        assertEq(localSbt.uri(42), "ipfs://soulport/42");
    }

    function testOracleOwnerOnlySetters() public {
        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        oracle.setProofVerifier(address(proofVerifier));

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        oracle.setReputationStaking(address(staking));

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        oracle.setVerifiedImporter(user, true);

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        oracle.setOracle(user, true);

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        oracle.setMaxInteractions(25);

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        oracle.setMaxTxVolume(10 ether);
    }

    function testStakingOwnerOnlySetters() public {
        vm.prank(owner);
        ReputationStaking localStaking = new ReputationStaking(owner);

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        localStaking.setTreasury(client);

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        localStaking.setSlasher(user, true);

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        localStaking.setMaxSlashBps(1_000);

        vm.prank(user);
        vm.expectRevert(bytes("Ownable: caller is not the owner"));
        localStaking.pause();
    }

    function testStakingPauseBlocksStakeUnstakeAndSlash() public {
        vm.prank(owner);
        ReputationStaking localStaking = new ReputationStaking(owner);

        vm.startPrank(owner);
        localStaking.setTreasury(client);
        localStaking.setSlasher(owner, true);
        vm.stopPrank();

        vm.deal(user, 3 ether);
        vm.prank(user);
        localStaking.stake{value: 1 ether}(1 ether, 7);

        vm.prank(owner);
        localStaking.pause();

        vm.prank(user);
        vm.expectRevert(bytes("Pausable: paused"));
        localStaking.stake{value: 1 ether}(1 ether, 7);

        vm.prank(user);
        vm.expectRevert(bytes("Pausable: paused"));
        localStaking.unstake();

        vm.prank(owner);
        vm.expectRevert(bytes("Pausable: paused"));
        localStaking.slash(user, 1e17);
    }

    function testWeb2ProofCountDoesNotDoubleCountSamePlatform() public {
        vm.prank(owner);
        oracle.setVerifiedImporter(owner, true);

        vm.prank(owner);
        oracle.submitWeb2Proof(user, "linkedin", "id-1", keccak256("proof-1"));

        vm.prank(owner);
        oracle.submitWeb2Proof(user, "linkedin", "id-1-updated", keccak256("proof-2"));

        assertEq(oracle.web2VerificationCount(user), 1);
    }

    function testWeb2ProofHashCannotBeReusedAcrossUsers() public {
        bytes32 sharedProof = keccak256("shared-proof");

        vm.prank(owner);
        oracle.setVerifiedImporter(owner, true);

        vm.prank(owner);
        oracle.submitWeb2Proof(user, "linkedin", "id-user", sharedProof);

        vm.prank(owner);
        vm.expectRevert(bytes("Oracle: proof hash already used"));
        oracle.submitWeb2Proof(client, "linkedin", "id-client", sharedProof);
    }

    function testWeb3ActivityValidationBounds() public {
        vm.prank(owner);
        oracle.setOracle(owner, true);

        vm.prank(owner);
        oracle.setMaxInteractions(2);

        vm.prank(owner);
        oracle.setMaxTxVolume(5 ether);

        string[] memory none = new string[](0);
        vm.prank(owner);
        vm.expectRevert(bytes("Oracle: empty interactions"));
        oracle.submitWeb3Activity(user, none, 1 ether);

        string[] memory tooMany = new string[](3);
        tooMany[0] = "A";
        tooMany[1] = "B";
        tooMany[2] = "C";
        vm.prank(owner);
        vm.expectRevert(bytes("Oracle: too many interactions"));
        oracle.submitWeb3Activity(user, tooMany, 1 ether);

        string[] memory okInteractions = new string[](1);
        okInteractions[0] = "Aave";

        vm.prank(owner);
        vm.expectRevert(bytes("Oracle: invalid tx volume"));
        oracle.submitWeb3Activity(user, okInteractions, 0);

        vm.prank(owner);
        vm.expectRevert(bytes("Oracle: tx volume too high"));
        oracle.submitWeb3Activity(user, okInteractions, 6 ether);
    }

    function testSlashingCapIsCumulativeAcrossCalls() public {
        vm.deal(user, 10 ether);

        vm.prank(user);
        staking.stake{value: 4 ether}(4 ether, 10);

        vm.prank(owner);
        staking.slash(user, 6e17);

        vm.prank(owner);
        staking.slash(user, 4e17);

        vm.prank(owner);
        vm.expectRevert(bytes("Staking: slash exceeds cap"));
        staking.slash(user, 1);
    }
}

contract MockSchemaRegistry is ISchemaRegistry {
    uint256 private nonce;

    function register(string calldata schema, address resolver, bool revocable)
        external
        returns (bytes32 uid)
    {
        uid = keccak256(abi.encode(schema, resolver, revocable, nonce, block.timestamp));
        nonce += 1;
    }
}

contract MockProofVerifier is IProofVerifier {
    bool private allowed = true;

    function setAllowed(bool isAllowed) external {
        allowed = isAllowed;
    }

    function verifyWeb2Proof(
        address,
        string calldata,
        string calldata,
        bytes32
    ) external view returns (bool) {
        return allowed;
    }
}

contract MockAttester is IEASAttester {
    address private lastRecipientValue;
    bytes32 private lastSchemaValue;
    bytes private lastDataValue;

    function attest(IEASAttester.AttestationRequest calldata request)
        external
        payable
        returns (bytes32 uid)
    {
        lastRecipientValue = request.data.recipient;
        lastSchemaValue = request.schema;
        lastDataValue = request.data.data;
        uid = keccak256(
            abi.encode(
                request.schema,
                request.data.recipient,
                request.data.expirationTime,
                request.data.revocable,
                request.data.refUID,
                request.data.data,
                request.data.value
            )
        );
    }

    function lastRecipient() external view returns (address) {
        return lastRecipientValue;
    }

    function lastSchema() external view returns (bytes32) {
        return lastSchemaValue;
    }

    function lastData() external view returns (bytes memory) {
        return lastDataValue;
    }
}
