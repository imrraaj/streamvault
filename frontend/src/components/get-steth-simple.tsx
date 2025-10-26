"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, STETH_ABI, VAULT_ABI } from "@/lib/contracts";

interface GetStETHDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GetStETHDialog({ open, onOpenChange }: GetStETHDialogProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const [amount, setAmount] = useState("0.01");
  const [loading, setLoading] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const { data: stETHBalance, refetch: refetchStETH } = useReadContract({
    address: CONTRACTS.STETH,
    abi: STETH_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const handleGetStETH = async () => {
    if (!address || !amount) return;

    setLoading(true);
    try {
      const amountWei = parseEther(amount);

      toast({ title: "Depositing ETH to get stETH..." });

      // Simple: Send ETH, get stETH
      await writeContractAsync({
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: "deposit",
        value: amountWei,
      });

      toast({
        title: "Success! 🎉",
        description: `You received ${amount} stETH!`,
      });

      // Refetch balance
      await new Promise((resolve) => setTimeout(resolve, 2000));
      refetchStETH();

      setAmount("0.01");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error getting stETH:", error);
      toast({
        title: "Transaction failed",
        description: error.message || "Please try again",
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
          <DialogTitle>Get stETH for Streaming</DialogTitle>
          <DialogDescription>
            Deposit ETH to receive stETH (1:1). Simple and direct.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {stETHBalance !== undefined && (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">Your stETH Balance</p>
              <p className="text-xl font-bold">
                {(Number(stETHBalance) / 1e18).toFixed(6)} stETH
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              step="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.01"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              You'll receive {amount} stETH (1:1 ratio)
            </p>
          </div>

          <Button
            onClick={handleGetStETH}
            disabled={!amount || parseFloat(amount) <= 0 || loading}
            className="w-full"
          >
            {loading ? "Processing..." : "Get stETH"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
