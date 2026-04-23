// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {SchemaRegistry} from "../src/SchemaRegistry.sol";
import {SoulPortSBT} from "../src/SoulPortSBT.sol";
import {ReputationStaking} from "../src/ReputationStaking.sol";
import {ReputationOracle} from "../src/ReputationOracle.sol";
import {SoulPortCore} from "../src/SoulPortCore.sol";
import {MockProofVerifier} from "../src/MockProofVerifier.sol";

contract DeployScript is Script {
    function run() external returns (SoulPortCore core) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address governanceOwner = vm.envAddress("GOVERNANCE_OWNER");
        bool registerSchemas = vm.envOr("REGISTER_SCHEMAS", true);
        bool useMockProofVerifier = vm.envBool("USE_MOCK_PROOF_VERIFIER");
        address externalSchemaRegistry = vm.envAddress("EAS_SCHEMA_REGISTRY");
        address attester = vm.envAddress("EAS_ATTESTER");
        address treasury = vm.envAddress("TREASURY");

        vm.startBroadcast(deployerPrivateKey);

        SchemaRegistry schemaRegistry = new SchemaRegistry(externalSchemaRegistry, deployer);
        SoulPortSBT soulPortSBT = new SoulPortSBT(deployer);
        ReputationStaking staking = new ReputationStaking(deployer);
        ReputationOracle oracle = new ReputationOracle(deployer);
        address proofVerifier;

        if (useMockProofVerifier) {
            MockProofVerifier mockProofVerifier = new MockProofVerifier(deployer);
            proofVerifier = address(mockProofVerifier);
            mockProofVerifier.transferOwnership(governanceOwner);
        } else {
            proofVerifier = vm.envAddress("PROOF_VERIFIER");
        }

        oracle.setProofVerifier(proofVerifier);
        oracle.setReputationStaking(address(staking));
        staking.setTreasury(treasury);
        core = new SoulPortCore(
            address(schemaRegistry),
            address(soulPortSBT),
            address(staking),
            address(oracle),
            attester,
            deployer
        );

        oracle.setVerifiedImporter(address(core), true);
        oracle.setOracle(address(core), true);
        staking.setSlasher(governanceOwner, true);

        if (registerSchemas) {
            schemaRegistry.registerReviewSchema();
            schemaRegistry.registerSkillSchema();
            schemaRegistry.registerWorkHistorySchema();
        }

        soulPortSBT.transferOwnership(address(core));
        staking.transferOwnership(address(core));
        oracle.transferOwnership(governanceOwner);
        schemaRegistry.transferOwnership(governanceOwner);
        core.transferOwnership(governanceOwner);

        vm.stopBroadcast();

        string memory root = vm.projectRoot();
        string memory deployedPath = string.concat(root, "/deployed.json");
        string memory deployedEnvPath = string.concat(root, "/deployed.env");

        vm.serializeAddress("soulport", "deployer", deployer);
        vm.serializeAddress("soulport", "schemaRegistry", address(schemaRegistry));
        vm.serializeAddress("soulport", "soulPortSBT", address(soulPortSBT));
        vm.serializeAddress("soulport", "reputationStaking", address(staking));
        vm.serializeAddress("soulport", "reputationOracle", address(oracle));
        string memory finalJson = vm.serializeAddress("soulport", "soulPortCore", address(core));
        vm.writeJson(finalJson, deployedPath);

        string memory deployedEnv = string(
            abi.encodePacked(
                "SOULPORT_SCHEMA_REGISTRY=",
                vm.toString(address(schemaRegistry)),
                "\nSOULPORT_SBT=",
                vm.toString(address(soulPortSBT)),
                "\nSOULPORT_STAKING=",
                vm.toString(address(staking)),
                "\nSOULPORT_ORACLE=",
                vm.toString(address(oracle)),
                "\nSOULPORT_PROOF_VERIFIER=",
                vm.toString(proofVerifier),
                "\nSOULPORT_CORE=",
                vm.toString(address(core)),
                "\nSOULPORT_GOVERNANCE_OWNER=",
                vm.toString(governanceOwner),
                "\nSOULPORT_USE_MOCK_PROOF_VERIFIER=",
                vm.toString(useMockProofVerifier),
                "\n"
            )
        );
        vm.writeFile(deployedEnvPath, deployedEnv);

        console2.log("SchemaRegistry:", address(schemaRegistry));
        console2.log("SoulPortSBT:", address(soulPortSBT));
        console2.log("ReputationStaking:", address(staking));
        console2.log("ReputationOracle:", address(oracle));
        console2.log("ProofVerifier:", proofVerifier);
        console2.log("SoulPortCore:", address(core));
        console2.log("GovernanceOwner:", governanceOwner);
        console2.log("UseMockProofVerifier:", useMockProofVerifier);
    }
}
