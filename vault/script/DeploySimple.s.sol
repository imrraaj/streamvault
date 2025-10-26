// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/StETH.sol";
import "../src/SimpleVault.sol";
import "../src/StreamPaymentV2.sol";

contract DeploySimple is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy StETH token (18 decimals)
        StETH stETH = new StETH();
        console.log("StETH deployed at:", address(stETH));

        // Deploy SimpleVault (ETH -> stETH)
        SimpleVault vault = new SimpleVault(stETH);
        console.log("SimpleVault deployed at:", address(vault));

        // Deploy StreamPaymentV2 (business logic)
        StreamPaymentV2 payment = new StreamPaymentV2(stETH);
        console.log("StreamPaymentV2 deployed at:", address(payment));

        // Give minting permissions
        // Vault needs to mint when users deposit ETH
        // Payment needs to burn when settling plays
        stETH.transferOwnership(address(vault));
        console.log("StETH ownership transferred to SimpleVault");

        console.log("\n=== Deployment Summary ===");
        console.log("1. Users deposit ETH -> Get stETH (1:1)");
        console.log("2. Users approve Payment contract to spend stETH");
        console.log("3. Backend settles plays automatically");
        console.log("4. Artists claim earnings");
        console.log("\nSet relayer: payment.setRelayer(<backend_address>)");

        vm.stopBroadcast();
    }
}
