"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";

export interface Split {
  address: string;
  percentage: number;
  role: string;
}

interface RevenueSplitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (splits: Split[]) => void;
  defaultAddress?: string;
}

export function RevenueSplitDialog({ open, onOpenChange, onSave, defaultAddress }: RevenueSplitDialogProps) {
  const [splits, setSplits] = useState<Split[]>([
    { address: defaultAddress || "", percentage: 100, role: "artist" },
  ]);

  const addSplit = () => {
    setSplits([...splits, { address: "", percentage: 0, role: "producer" }]);
  };

  const removeSplit = (index: number) => {
    setSplits(splits.filter((_, i) => i !== index));
  };

  const updateSplit = (index: number, field: keyof Split, value: string | number) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    setSplits(newSplits);
  };

  const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);

  const handleSave = () => {
    if (totalPercentage !== 100) {
      alert("Total percentage must equal 100%");
      return;
    }

    if (splits.some(s => !s.address || s.percentage <= 0)) {
      alert("All splits must have valid address and percentage");
      return;
    }

    onSave(splits);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revenue Splits</DialogTitle>
          <DialogDescription>
            Define how revenue will be split among collaborators. Total must equal 100%.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {splits.map((split, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1 space-y-2">
                <Label>Wallet Address</Label>
                <Input
                  value={split.address}
                  onChange={(e) => updateSplit(index, "address", e.target.value)}
                  placeholder="0x..."
                />
              </div>

              <div className="w-32 space-y-2">
                <Label>Percentage</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={split.percentage}
                  onChange={(e) => updateSplit(index, "percentage", parseInt(e.target.value) || 0)}
                  placeholder="50"
                />
              </div>

              <div className="w-40 space-y-2">
                <Label>Role</Label>
                <Select value={split.role} onValueChange={(value) => updateSplit(index, "role", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="artist">Artist</SelectItem>
                    <SelectItem value="producer">Producer</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="label">Label</SelectItem>
                    <SelectItem value="writer">Writer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {splits.length > 1 && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeSplit(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={addSplit}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Split
          </Button>

          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium">
              Total: {totalPercentage}%
              {totalPercentage !== 100 && (
                <span className="text-destructive ml-2">(Must be 100%)</span>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={totalPercentage !== 100} className="flex-1">
              Save Splits
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
