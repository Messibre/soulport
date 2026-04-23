// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "./oz/token/ERC1155/ERC1155.sol";
import {Ownable} from "./oz/access/Ownable.sol";

contract SoulPortSBT is ERC1155, Ownable {
    mapping(uint256 => string) private tokenURIs;

    event Minted(address indexed to, uint256 indexed id, uint256 amount, bytes data);
    event URISet(uint256 indexed id, string uriValue);

    constructor(address initialOwner) ERC1155("") Ownable(initialOwner) {}

    function mint(address to, uint256 id, uint256 amount, bytes memory data) external onlyOwner {
        require(to != address(0), "Soulbound: zero address");
        require(amount > 0, "Soulbound: amount must be > 0");

        _mint(to, id, amount, data);
        emit Minted(to, id, amount, data);
    }

    function setURI(uint256 id, string memory uriValue) external onlyOwner {
        tokenURIs[id] = uriValue;
        emit URISet(id, uriValue);
    }

    function uri(uint256 id) public view override returns (string memory) {
        return tokenURIs[id];
    }

    function safeTransferFrom(address, address, uint256, uint256, bytes memory)
        public
        pure
        override
    {
        revert("Soulbound: Cannot transfer");
    }

    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory)
        public
        pure
        override
    {
        revert("Soulbound: Cannot transfer");
    }

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
        public
        view
        override
        returns (uint256[] memory)
    {
        return super.balanceOfBatch(accounts, ids);
    }
}
