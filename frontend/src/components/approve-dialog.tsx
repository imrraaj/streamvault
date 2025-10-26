"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAccount, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, STETH_ABI } from "@/lib/contracts";

interface ApproveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApproveDialog({ open, onOpenChange }: ApproveDialogProps) {
  const { address } = useAccount();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { writeContractAsync } = useWriteContract();

  const handleApprove = async () => {
    if (!address) return;

    setLoading(true);
    try {
      // Approve unlimited spending (or set a reasonable limit)
      const amount = parseEther("1000000"); // 1M stETH

      const hash = await writeContractAsync({
        address: CONTRACTS.STETH,
        abi: STETH_ABI,
        functionName: "approve",
        args: [CONTRACTS.PAYMENT, amount],
      });

      toast({
        title: "Approved! 🎉",
        description: "You can now stream music seamlessly. The backend will handle payments.",
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error approving:", error);
      toast({
        title: "Approval failed",
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
          <DialogTitle>Approve Seamless Streaming</DialogTitle>
          <DialogDescription>
            Approve the payment contract to spend your stETH. You only need to do this once.
            The backend will automatically deduct payment when you play songs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">What happens after approval?</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Play any song without signing transactions</li>
              <li>Backend automatically deducts payment</li>
              <li>Payments distributed to artists instantly</li>
              <li>Revenue splits handled automatically</li>
            </ul>
          </div>

          <Button
            onClick={handleApprove}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Approving..." : "Approve Payment Contract"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
