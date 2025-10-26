// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../src/StETH.sol";
import "../src/Streamvault.sol";

contract DeployVaultOnly is Script {
    // Base Sepolia WETH address
    address constant WETH_BASE_SEPOLIA = 0x4200000000000000000000000000000000000006;

    // Existing StETH contract (18 decimals)
    address constant STETH_ADDRESS = 0x48a82466E6f8C4bf6B83Bc7278839dCe3331D396;

    function run() external {
        // Use private key from --private-key flag
        vm.startBroadcast();

        // Use existing stETH contract
        StETH stETH = StETH(STETH_ADDRESS);
        console.log("Using existing StETH at:", address(stETH));

        // Deploy StreamVault (for WETH <-> stETH conversion)
        StreamVault vault = new StreamVault(IERC20(WETH_BASE_SEPOLIA), stETH);
        console.log("StreamVault deployed at:", address(vault));

        console.log("\n=== Deployment Summary ===");
        console.log("StETH (existing):", STETH_ADDRESS);
        console.log("StreamVault (new):", address(vault));
        console.log("StreamPaymentV2 (existing): 0x28DebD513a9f98353cFD9E9D9b7Bf586544340D5");
        console.log("\nUsers can now convert WETH <-> stETH via the new vault");

        vm.stopBroadcast();
    }
}
