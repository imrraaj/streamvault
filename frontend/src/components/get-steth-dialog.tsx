"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { CONTRACTS, STETH_ABI, VAULT_ABI } from "@/lib/contracts";

const WETH_ADDRESS = process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`;

const WETH_ABI = [
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

interface GetStETHDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GetStETHDialog({ open, onOpenChange }: GetStETHDialogProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const [amount, setAmount] = useState("0.01");
  const [step, setStep] = useState<"input" | "wrapping" | "approving" | "depositing">("input");

  const { writeContractAsync } = useWriteContract();

  const { data: stETHBalance, refetch: refetchStETH } = useReadContract({
    address: CONTRACTS.STETH,
    abi: STETH_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const handleGetStETH = async () => {
    if (!address || !amount) return;

    try {
      const amountWei = parseEther(amount);

      // Step 1: Wrap ETH to WETH
      setStep("wrapping");
      toast({ title: "Step 1/3: Wrapping ETH to WETH..." });

      const wrapHash = await writeContractAsync({
        address: WETH_ADDRESS,
        abi: WETH_ABI,
        functionName: "deposit",
        value: amountWei,
      });

      toast({ title: "Waiting for WETH wrap confirmation..." });
      // Wait a bit for transaction to be mined
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 2: Approve Vault to spend WETH
      setStep("approving");
      toast({ title: "Step 2/3: Approving Vault to spend WETH..." });

      const approveHash = await writeContractAsync({
        address: WETH_ADDRESS,
        abi: WETH_ABI,
        functionName: "approve",
        args: [CONTRACTS.VAULT, amountWei],
      });

      toast({ title: "Waiting for approval confirmation..." });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 3: Deposit WETH to Vault, get stETH
      setStep("depositing");
      toast({ title: "Step 3/3: Depositing WETH to get stETH..." });

      const depositHash = await writeContractAsync({
        address: CONTRACTS.VAULT,
        abi: VAULT_ABI,
        functionName: "deposit",
        args: [amountWei, address],
      });

      toast({
        title: "Success! 🎉",
        description: `You now have ${amount} stETH. You can start streaming music!`,
      });

      // Refetch balance
      await new Promise((resolve) => setTimeout(resolve, 2000));
      refetchStETH();

      setAmount("0.01");
      setStep("input");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error getting stETH:", error);
      toast({
        title: "Transaction failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setStep("input");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Get stETH for Streaming</DialogTitle>
          <DialogDescription>
            Convert your ETH to stETH to start streaming music. This is a 3-step process:
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Wrap ETH → WETH</li>
              <li>Approve Vault</li>
              <li>Deposit WETH → Get stETH (1:1 ratio)</li>
            </ol>
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
              disabled={step !== "input"}
            />
            <p className="text-xs text-muted-foreground">
              You'll receive {amount} stETH (1:1 ratio, 18 decimals like ETH)
            </p>
          </div>

          <Button
            onClick={handleGetStETH}
            disabled={!amount || parseFloat(amount) <= 0 || step !== "input"}
            className="w-full"
          >
            {step === "input" && "Get stETH"}
            {step === "wrapping" && "Wrapping ETH..."}
            {step === "approving" && "Approving Vault..."}
            {step === "depositing" && "Getting stETH..."}
          </Button>

          {step !== "input" && (
            <p className="text-sm text-muted-foreground text-center">
              Please confirm transactions in your wallet...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
