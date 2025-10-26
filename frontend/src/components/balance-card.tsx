"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Coins, Plus, ArrowDownToLine } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, STETH_ABI } from "@/lib/contracts";
import { GetStETHDialog } from "./get-steth-simple";
import { DepositDialog } from "./deposit-dialog";
import { WithdrawDialog } from "./withdraw-dialog";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

export function BalanceCard() {
  const { address } = useAccount();
  const [showGetStETH, setShowGetStETH] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [manualBalance, setManualBalance] = useState<bigint | null>(null);

  const { data: stETHBalance, error, isLoading } = useReadContract({
    address: CONTRACTS.STETH,
    abi: STETH_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    },
  });

  // Manual balance fetch as fallback
  useEffect(() => {
    if (!address) return;

    const fetchBalance = async () => {
      try {
        const publicClient = createPublicClient({
          chain: baseSepolia,
          transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
        });

        const balance = await publicClient.readContract({
          address: CONTRACTS.STETH as `0x${string}`,
          abi: [{
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          }],
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });

        setManualBalance(balance as bigint);
      } catch (err) {
        console.error('Manual balance fetch failed:', err);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [address]);

  // Use manual balance if wagmi fails
  const displayBalance = stETHBalance ?? manualBalance;

  return (
    <>
      <div className="p-2 flex items-center gap-3">
        <div>
          <p className="text-xs text-muted-foreground">stETH Balance</p>
          <p className="font-semibold" title={`Address: ${address}\nBalance: ${displayBalance}\nContract: ${CONTRACTS.STETH}`}>
            {displayBalance !== null && displayBalance !== undefined
              ? (Number(displayBalance) / 1e18).toFixed(6)
              : "0.000000"
            } stETH
          </p>
          {address && <p className="text-xs text-muted-foreground">{address.slice(0, 6)}...{address.slice(-4)}</p>}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={() => setShowGetStETH(true)} title="Get stETH">
            <Coins className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setShowDeposit(true)} title="Deposit for streaming">
            <Plus className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setShowWithdraw(true)} title="Withdraw stETH to ETH">
            <ArrowDownToLine className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <GetStETHDialog open={showGetStETH} onOpenChange={setShowGetStETH} />
      <WithdrawDialog open={showWithdraw} onOpenChange={setShowWithdraw} />
    </>
  );
}
