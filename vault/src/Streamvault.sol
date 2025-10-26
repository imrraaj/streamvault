// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC20/extensions/ERC4626.sol";
import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "./StETH.sol";

/**
 * @title StreamVault
 * @dev ERC4626 vault that accepts WETH and mints stETH tokens for streaming
 */
contract StreamVault is ERC4626 {
    StETH public immutable stETH;

    event StreamPayment(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    constructor(IERC20 weth, StETH _stETH)
        ERC4626(weth)
        ERC20("StreamVault Shares", "svETH")
    {
        stETH = _stETH;
    }

    /**
     * @dev Override decimals to match stETH (6 decimals)
     */
    function decimals() public pure override(ERC4626) returns (uint8) {
        return 18;
    }

    /**
     * @dev Deposit WETH and receive stETH tokens for streaming
     */
    function depositForStreaming(uint256 assets, address receiver)
        external
        returns (uint256 shares)
    {
        shares = deposit(assets, receiver);

        // Mint stETH tokens 1:1 with shares for streaming usage
        stETH.mint(receiver, shares);
        return shares;
    }

    /**
     * @dev Withdraw assets and burn equivalent stETH
     */
    function withdrawWithBurn(
        uint256 assets,
        address receiver,
        address owner
    ) external returns (uint256 shares) {
        shares = withdraw(assets, receiver, owner);

        // Burn stETH tokens
        if (msg.sender == owner) {
            stETH.burn(owner, shares);
        }

        emit Withdrawn(receiver, assets);
        return shares;
    }

    /**
     * @dev Pay for streaming - deducts stETH from user's balance
     */
    function payForStream(address user, uint256 amount) external {
        require(stETH.balanceOf(user) >= amount, "Insufficient stETH balance");
        stETH.burn(user, amount);
        emit StreamPayment(user, amount);
    }
}
