// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

/**
 * @title StETH
 * @dev Streaming ETH token with 18 decimals (same as ETH), used for pay-per-stream model
 * Supports seamless payments via approval mechanism
 */
contract StETH is ERC20, Ownable {
    constructor() ERC20("Streaming ETH", "stETH") Ownable(msg.sender) {}

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from an address
     * Only owner (StreamPaymentV2 contract) can call
     * Respects allowance if burning from another address
     */
    function burn(address from, uint256 amount) external onlyOwner {
        // If burning from another address, check and decrease allowance
        if (from != msg.sender) {
            uint256 currentAllowance = allowance(from, msg.sender);
            require(currentAllowance >= amount, "ERC20: burn amount exceeds allowance");
            _approve(from, msg.sender, currentAllowance - amount);
        }
        _burn(from, amount);
    }

    /**
     * @dev Public burn function for users to burn their own tokens
     */
    function burnSelf(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
