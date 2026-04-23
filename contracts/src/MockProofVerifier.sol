// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./oz/access/Ownable.sol";
import {IProofVerifier} from "./interfaces/IProofVerifier.sol";

contract MockProofVerifier is Ownable, IProofVerifier {
    bool private allowed = true;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setAllowed(bool isAllowed) external onlyOwner {
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