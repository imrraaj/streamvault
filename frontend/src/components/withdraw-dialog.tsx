"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { CONTRACTS, STETH_ABI, VAULT_ABI, parseStETH, formatStETH } from "@/lib/contracts";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";

interface WithdrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawDialog({ open, onOpenChange }: WithdrawDialogProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [manualBalance, setManualBalance] = useState<bigint | null>(null);
  const { toast } = useToast();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: stETHBalance } = useReadContract({
    address: CONTRACTS.STETH,
    abi: STETH_ABI,
    functionName: 'balanceOf',
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

  const displayBalance = (stETHBalance as bigint | undefined) ?? manualBalance;

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const amountWei = parseStETH(amount);

      // Step 1: Approve vault to burn stETH
      toast({
        title: "Approval required",
        description: "Please approve the transaction to allow withdrawal",
      });

      await writeContractAsync({
        address: CONTRACTS.STETH,
        abi: STETH_ABI,
        functionName: "approve",
        args: [CONTRACTS.VAULT, amountWei],
      });

      // Step 2: Call SimpleVault.withdraw() - burns stETH and sends ETH back
      toast({
        title: "Withdrawing...",
        description: "Please confirm the withdrawal transaction",
      });

      await writeContractAsync({
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: "withdraw",
        args: [amountWei],
      });

      toast({
        title: "Withdrawal successful!",
        description: `Withdrew ${amount} stETH and received ${amount} ETH`,
      });

      onOpenChange(false);
      setAmount("");
    } catch (error: any) {
      toast({
        title: "Withdrawal failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw to ETH</DialogTitle>
          <DialogDescription>
            Convert stETH back to ETH (1:1). Available: {displayBalance ? formatStETH(displayBalance) : "0.000000"} stETH
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (stETH)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              step="0.000001"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleWithdraw} disabled={loading}>
            {loading ? "Processing..." : "Withdraw to ETH"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
