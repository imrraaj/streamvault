// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/StETH.sol";
import "../src/StreamPaymentV2.sol";
import "../src/SimpleVault.sol";

contract DeployCorrect is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy StETH (deployer is owner)
        StETH stETH = new StETH();
        console.log("StETH deployed at:", address(stETH));

        // Deploy StreamPaymentV2
        StreamPaymentV2 payment = new StreamPaymentV2(stETH);
        console.log("StreamPaymentV2 deployed at:", address(payment));

        // Transfer StETH ownership to StreamPaymentV2
        stETH.transferOwnership(address(payment));
        console.log("StETH ownership transferred to StreamPaymentV2");

        // Set relayer on StreamPaymentV2
        payment.setRelayer(vm.addr(vm.envUint("RELAYER_PRIVATE_KEY")));
        console.log("Relayer set on StreamPaymentV2");

        // Deploy SimpleVault for ETH <-> stETH conversion (optional)
        SimpleVault vault = new SimpleVault(stETH);
        console.log("SimpleVault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
