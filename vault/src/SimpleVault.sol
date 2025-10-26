// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./StETH.sol";

/**
 * @title SimpleVault
 * @dev Simple wrapper: Deposit ETH, get stETH 1:1
 */
contract SimpleVault {
    StETH public immutable stETH;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(StETH _stETH) {
        stETH = _stETH;
    }

    /**
     * @dev Deposit ETH, receive stETH 1:1
     */
    function deposit() external payable returns (uint256) {
        require(msg.value > 0, "Must send ETH");

        // Mint stETH 1:1 with ETH
        stETH.mint(msg.sender, msg.value);

        emit Deposited(msg.sender, msg.value);
        return msg.value;
    }

    /**
     * @dev Withdraw: Burn stETH, get ETH back
     */
    function withdraw(uint256 amount) external {
        require(amount > 0, "Invalid amount");
        require(address(this).balance >= amount, "Insufficient vault balance");

        // Burn stETH from user
        stETH.burn(msg.sender, amount);

        // Send ETH back
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "ETH transfer failed");

        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev Transfer stETH ownership (admin function)
     */
    function transferStETHOwnership(address newOwner) external {
        stETH.transferOwnership(newOwner);
    }

    /**
     * @dev Allow contract to receive ETH
     */
    receive() external payable {}
}
