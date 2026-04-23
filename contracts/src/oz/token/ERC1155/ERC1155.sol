// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ERC1155 {
    mapping(uint256 => mapping(address => uint256)) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    string private _baseUri;

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);

    constructor(string memory baseUri_) {
        _baseUri = baseUri_;
    }

    function uri(uint256) public view virtual returns (string memory) {
        return _baseUri;
    }

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        require(account != address(0), "ERC1155: invalid account");
        return _balances[id][account];
    }

    function balanceOfBatch(address[] memory accounts, uint256[] memory ids)
        public
        view
        virtual
        returns (uint256[] memory)
    {
        require(accounts.length == ids.length, "ERC1155: length mismatch");

        uint256[] memory batchBalances = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            batchBalances[i] = balanceOf(accounts[i], ids[i]);
        }

        return batchBalances;
    }

    function setApprovalForAll(address operator, bool approved) public {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data)
        public
        virtual
    {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC1155: not authorized");
        _safeTransferFrom(from, to, id, value, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public virtual {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "ERC1155: not authorized");
        require(ids.length == values.length, "ERC1155: length mismatch");

        for (uint256 i = 0; i < ids.length; i++) {
            _safeTransferFrom(from, to, ids[i], values[i], data);
        }

        emit TransferBatch(msg.sender, from, to, ids, values);
    }

    function _safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory)
        internal
    {
        require(to != address(0), "ERC1155: invalid receiver");

        uint256 fromBalance = _balances[id][from];
        require(fromBalance >= value, "ERC1155: insufficient balance");
        unchecked {
            _balances[id][from] = fromBalance - value;
        }
        _balances[id][to] += value;

        emit TransferSingle(msg.sender, from, to, id, value);
    }

    function _mint(address to, uint256 id, uint256 amount, bytes memory) internal {
        require(to != address(0), "ERC1155: invalid receiver");

        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
    }
}
