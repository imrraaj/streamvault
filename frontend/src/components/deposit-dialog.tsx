"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useWriteContract, useReadContract } from "wagmi";
import { CONTRACTS, STETH_ABI, PAYMENT_ABI, parseStETH, formatStETH } from "@/lib/contracts";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositDialog({ open, onOpenChange }: DepositDialogProps) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const { data: stETHBalance } = useReadContract({
    address: CONTRACTS.STETH,
    abi: STETH_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const handleDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const amountWei = parseStETH(amount);

      // Approve stETH
      const approveTx = await writeContractAsync({
        address: CONTRACTS.STETH,
        abi: STETH_ABI,
        functionName: "approve",
        args: [CONTRACTS.PAYMENT, amountWei],
      });

      toast({ title: "Approval confirmed", description: "Depositing..." });

      // Deposit
      await writeContractAsync({
        address: CONTRACTS.PAYMENT,
        abi: PAYMENT_ABI,
        functionName: "deposit",
        args: [amountWei],
      });

      toast({
        title: "Deposit successful!",
        description: `Deposited ${amount} stETH`,
      });

      onOpenChange(false);
      setAmount("");
    } catch (error: any) {
      toast({
        title: "Deposit failed",
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
          <DialogTitle>Deposit stETH</DialogTitle>
          <DialogDescription>
            Deposit stETH to your streaming balance. Available: {formatStETH(stETHBalance || 0n)} stETH
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (stETH)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.1"
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
          <Button onClick={handleDeposit} disabled={loading}>
            {loading ? "Processing..." : "Deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
