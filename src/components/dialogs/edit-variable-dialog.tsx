"use client";

import { useState, useEffect, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { encryptVariable } from "@/lib/crypto/encryption";
import { updateVariable } from "@/lib/actions/variables";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { DecryptedVar } from "@/types/variables";

interface EditVariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable: DecryptedVar;
  cryptoKey: CryptoKey | null;
  onSuccess: (updated: DecryptedVar) => void;
}

export const EditVariableDialog = memo(function EditVariableDialog({
  open,
  onOpenChange,
  variable,
  cryptoKey,
  onSuccess,
}: EditVariableDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [key, setKey] = useState(variable.key);
  const [value, setValue] = useState(variable.value);
  const [isSecret, setIsSecret] = useState(variable.isSecret);

  // Reset form when dialog opens with new variable
  useEffect(() => {
    if (open) {
      setKey(variable.key);
      setValue(variable.value);
      setIsSecret(variable.isSecret);
    }
  }, [open, variable]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cryptoKey) return;

    setIsLoading(true);

    try {
      const encrypted = await encryptVariable(key, value, cryptoKey);

      await updateVariable(variable.id, {
        ...encrypted,
        isSecret,
      });

      toast.success("Variable updated");
      onOpenChange(false);
      onSuccess({ id: variable.id, key, value, isSecret });
    } catch (error) {
      logger.error("Failed to update variable", error);
      toast.error("Failed to update variable");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Variable</DialogTitle>
          <DialogDescription>
            Update the variable. Changes will be encrypted before saving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-key" className="text-sm font-medium">
                Key
              </label>
              <Input
                id="edit-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="DATABASE_URL"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-value" className="text-sm font-medium">
                Value
              </label>
              <Input
                id="edit-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="postgresql://..."
                required
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-isSecret"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="edit-isSecret" className="text-sm">
                Mark as secret (hide value by default)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !cryptoKey}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
