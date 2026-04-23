// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IProofVerifier {
    function verifyWeb2Proof(
        address user,
        string calldata platform,
        string calldata externalId,
        bytes32 proofHash
    ) external view returns (bool);
}
