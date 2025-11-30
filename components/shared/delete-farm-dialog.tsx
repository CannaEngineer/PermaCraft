"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface DeleteFarmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmName: string;
  farmId: string;
  onDeleteSuccess: () => void;
}

export function DeleteFarmDialog({
  open,
  onOpenChange,
  farmName,
  farmId,
  onDeleteSuccess,
}: DeleteFarmDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmValid = confirmText === "DELETE FARM";

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/farms/${farmId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete farm");
      }

      onDeleteSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete farm");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setConfirmText("");
      setError(null);
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Farm
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-3">
            <p className="font-semibold text-foreground">
              You are about to permanently delete: <span className="text-red-600">{farmName}</span>
            </p>
            <p>This action will delete:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>All zones and boundaries</li>
              <li>All plantings</li>
              <li>All AI conversations and analyses</li>
              <li>All map screenshots</li>
              <li>All collaborators</li>
            </ul>
            <p className="font-bold text-red-600">
              This action cannot be undone!
            </p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Type <span className="font-mono font-bold">DELETE FARM</span> to confirm:
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE FARM"
              className={confirmText && !isConfirmValid ? "border-red-500" : ""}
              disabled={isDeleting}
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Farm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
