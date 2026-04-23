// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "./oz/access/Ownable.sol";
import {Pausable} from "./oz/utils/Pausable.sol";
import {ReentrancyGuard} from "./oz/utils/ReentrancyGuard.sol";

contract ReputationStaking is Ownable, Pausable, ReentrancyGuard {
    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 lockPeriod;
    }

    mapping(address => StakeInfo) public stakingInfo;
    mapping(address => bool) public slashers;
    mapping(address => uint256) public slashCapBase;
    mapping(address => uint256) public slashedInCycle;

    address public treasury;
    uint256 public maxSlashBps = 2_500;

    event Staked(address indexed user, uint256 amount, uint256 lockPeriod, uint256 unlockTimestamp);
    event Unstaked(address indexed user, uint256 amount);
    event Slashed(address indexed freelancer, address indexed treasury, uint256 amount);
    event TreasuryUpdated(address indexed treasury);
    event SlasherUpdated(address indexed slasher, bool isAllowed);
    event MaxSlashBpsUpdated(uint256 maxSlashBps);

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlySlasher() {
        require(msg.sender == owner() || slashers[msg.sender], "Staking: caller is not slasher");
        _;
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Staking: invalid treasury");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setSlasher(address slasher, bool isAllowed) external onlyOwner {
        slashers[slasher] = isAllowed;
        emit SlasherUpdated(slasher, isAllowed);
    }

    function setMaxSlashBps(uint256 newMaxSlashBps) external onlyOwner {
        require(newMaxSlashBps > 0 && newMaxSlashBps <= 10_000, "Staking: invalid slash bps");
        maxSlashBps = newMaxSlashBps;
        emit MaxSlashBpsUpdated(newMaxSlashBps);
    }

    function stake(uint256 amount, uint256 lockPeriodDays) external payable whenNotPaused nonReentrant {
        require(amount > 0, "Staking: amount must be > 0");
        require(msg.value == amount, "Staking: value mismatch");
        require(lockPeriodDays > 0, "Staking: lock period must be > 0");

        StakeInfo storage info = stakingInfo[msg.sender];
        bool isNewStakeCycle = info.amount == 0;
        uint256 lockPeriodSeconds = lockPeriodDays * 1 days;

        if (info.amount == 0) {
            info.timestamp = block.timestamp;
            info.lockPeriod = lockPeriodSeconds;
        } else {
            uint256 currentUnlock = info.timestamp + info.lockPeriod;
            uint256 proposedUnlock = block.timestamp + lockPeriodSeconds;
            if (proposedUnlock > currentUnlock) {
                info.timestamp = block.timestamp;
                info.lockPeriod = lockPeriodSeconds;
            }
        }

        info.amount += amount;

        if (isNewStakeCycle) {
            slashCapBase[msg.sender] = amount;
            slashedInCycle[msg.sender] = 0;
        } else {
            slashCapBase[msg.sender] += amount;
        }

        emit Staked(msg.sender, amount, info.lockPeriod, info.timestamp + info.lockPeriod);
    }

    function unstake() external whenNotPaused nonReentrant {
        StakeInfo storage info = stakingInfo[msg.sender];
        uint256 amount = info.amount;

        require(amount > 0, "Staking: nothing to unstake");
        require(block.timestamp >= info.timestamp + info.lockPeriod, "Staking: lock period active");

        info.amount = 0;
        info.timestamp = 0;
        info.lockPeriod = 0;
        slashCapBase[msg.sender] = 0;
        slashedInCycle[msg.sender] = 0;

        (bool sent,) = payable(msg.sender).call{value: amount}("");
        require(sent, "Staking: transfer failed");

        emit Unstaked(msg.sender, amount);
    }

    function slash(address freelancer, uint256 amount)
        external
        onlySlasher
        whenNotPaused
        nonReentrant
    {
        require(freelancer != address(0), "Staking: invalid freelancer");
        require(amount > 0, "Staking: invalid amount");
        require(treasury != address(0), "Staking: treasury not set");

        StakeInfo storage info = stakingInfo[freelancer];
        require(info.amount >= amount, "Staking: insufficient staked amount");

        uint256 maxSlashAmount = (slashCapBase[freelancer] * maxSlashBps) / 10_000;
        require(slashedInCycle[freelancer] + amount <= maxSlashAmount, "Staking: slash exceeds cap");

        info.amount -= amount;
        slashedInCycle[freelancer] += amount;
        if (info.amount == 0) {
            info.timestamp = 0;
            info.lockPeriod = 0;
            slashCapBase[freelancer] = 0;
            slashedInCycle[freelancer] = 0;
        }

        (bool sent,) = payable(treasury).call{value: amount}("");
        require(sent, "Staking: slash transfer failed");

        emit Slashed(freelancer, treasury, amount);
    }

    function getReputationWeight(address user) external view returns (uint256) {
        uint256 amount = stakingInfo[user].amount;

        if (amount >= 10 ether) {
            return 2e18;
        }
        if (amount >= 5 ether) {
            return 15e17;
        }
        if (amount >= 1 ether) {
            return 12e17;
        }

        return 1e18;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
