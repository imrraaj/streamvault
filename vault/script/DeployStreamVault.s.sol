// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../src/StETH.sol";
import "../src/Streamvault.sol";
import "../src/StreamPaymentV2.sol";

contract DeployStreamVault is Script {
    // Base Sepolia WETH address
    address constant WETH_BASE_SEPOLIA = 0x4200000000000000000000000000000000000006;

    function run() external {
        // Use private key from --private-key flag
        vm.startBroadcast();

        // Deploy StETH token
        StETH stETH = new StETH();
        console.log("StETH deployed at:", address(stETH));

        // Deploy StreamVault (for WETH <-> stETH conversion)
        StreamVault vault = new StreamVault(IERC20(WETH_BASE_SEPOLIA), stETH);
        console.log("StreamVault deployed at:", address(vault));

        // Deploy StreamPaymentV2 (business logic)
        StreamPaymentV2 payment = new StreamPaymentV2(stETH);
        console.log("StreamPaymentV2 deployed at:", address(payment));

        // Transfer stETH ownership to StreamPaymentV2 (it handles minting/burning)
        stETH.transferOwnership(address(payment));
        console.log("StETH ownership transferred to StreamPaymentV2");

        console.log("\n=== Deployment Summary ===");
        console.log("1. Users get stETH from StreamVault (WETH -> stETH)");
        console.log("2. Users deposit stETH into StreamPaymentV2 once");
        console.log("3. Backend authorizes plays via HTTP 402 (no per-song signing!)");
        console.log("4. Settlements batched on-chain every 5 minutes");
        console.log("5. Artists claim earnings from StreamPaymentV2");
        console.log("\nDon't forget to set relayer address:");
        console.log("  payment.setRelayer(<backend_wallet_address>)");

        vm.stopBroadcast();
    }
}
