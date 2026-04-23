// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./oz/access/Ownable.sol";

import {ISchemaRegistry} from "./interfaces/eas/ISchemaRegistry.sol";

contract SchemaRegistry is Ownable {
    ISchemaRegistry public immutable easSchemaRegistry;

    bytes32 public reviewSchemaUID;
    bytes32 public skillSchemaUID;
    bytes32 public workHistorySchemaUID;

    string internal constant REVIEW_SCHEMA =
        "address reviewer,address reviewee,uint8 rating,string reviewText,uint256 timestamp";
    string internal constant SKILL_SCHEMA =
        "address user,string skillName,uint256 score,string evidenceURI,uint256 timestamp";
    string internal constant WORK_HISTORY_SCHEMA =
        "address user,string platform,string role,string organization,uint256 startDate,uint256 endDate,bytes32 proofHash";

    event ReviewSchemaRegistered(bytes32 indexed schemaUID);
    event SkillSchemaRegistered(bytes32 indexed schemaUID);
    event WorkHistorySchemaRegistered(bytes32 indexed schemaUID);

    constructor(address schemaRegistryAddress, address initialOwner) Ownable(initialOwner) {
        require(schemaRegistryAddress != address(0), "SchemaRegistry: invalid EAS registry");
        easSchemaRegistry = ISchemaRegistry(schemaRegistryAddress);
    }

    function registerReviewSchema() external onlyOwner returns (bytes32 schemaUID) {
        schemaUID = easSchemaRegistry.register(REVIEW_SCHEMA, address(0), true);
        reviewSchemaUID = schemaUID;
        emit ReviewSchemaRegistered(schemaUID);
    }

    function registerSkillSchema() external onlyOwner returns (bytes32 schemaUID) {
        schemaUID = easSchemaRegistry.register(SKILL_SCHEMA, address(0), true);
        skillSchemaUID = schemaUID;
        emit SkillSchemaRegistered(schemaUID);
    }

    function registerWorkHistorySchema() external onlyOwner returns (bytes32 schemaUID) {
        schemaUID = easSchemaRegistry.register(WORK_HISTORY_SCHEMA, address(0), true);
        workHistorySchemaUID = schemaUID;
        emit WorkHistorySchemaRegistered(schemaUID);
    }
}
