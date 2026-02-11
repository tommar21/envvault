"use client";

import { useState, memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CopyPlus, Loader2 } from "lucide-react";
import { encryptVariable } from "@/lib/crypto/encryption";
import { createVariable } from "@/lib/actions/variables";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { DecryptedVar } from "@/types/variables";

interface CopyEnvironmentDialogProps {
  sourceEnvId: string;
  sourceEnvName: string;
  environments: Array<{ id: string; name: string }>;
  cryptoKey: CryptoKey | null;
  decryptedVars: DecryptedVar[];
  onSuccess: (targetEnvId: string, copiedVars: DecryptedVar[]) => void;
}

export const CopyEnvironmentDialog = memo(function CopyEnvironmentDialog({
  sourceEnvId,
  sourceEnvName,
  environments,
  cryptoKey,
  decryptedVars,
  onSuccess,
}: CopyEnvironmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [targetEnvId, setTargetEnvId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const targetEnvs = environments.filter((e) => e.id !== sourceEnvId);

  async function handleCopy() {
    if (!cryptoKey || !targetEnvId || decryptedVars.length === 0) return;

    setIsLoading(true);
    setProgress({ current: 0, total: decryptedVars.length });

    try {
      const copiedVars: DecryptedVar[] = [];

      for (let i = 0; i < decryptedVars.length; i++) {
        const v = decryptedVars[i];
        setProgress({ current: i + 1, total: decryptedVars.length });

        const encrypted = await encryptVariable(v.key, v.value, cryptoKey);
        const created = await createVariable(targetEnvId, {
          ...encrypted,
          isSecret: v.isSecret,
        });

        copiedVars.push({
          id: created.id,
          key: v.key,
          value: v.value,
          isSecret: v.isSecret,
          updatedAt: created.updatedAt,
        });
      }

      const targetName = targetEnvs.find((e) => e.id === targetEnvId)?.name || "target";
      toast.success(`Copied ${copiedVars.length} variables to ${targetName}`);
      setOpen(false);
      setTargetEnvId("");
      setProgress({ current: 0, total: 0 });
      onSuccess(targetEnvId, copiedVars);
    } catch (error) {
      logger.error("Failed to copy environment", error);
      toast.error("Failed to copy variables");
    } finally {
      setIsLoading(false);
    }
  }

  if (targetEnvs.length === 0 || decryptedVars.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !isLoading && setOpen(v)}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <CopyPlus className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Copy Environment</DialogTitle>
          <DialogDescription>
            Copy all {decryptedVars.length} variables from <strong>{sourceEnvName}</strong> to another environment. Variables will be re-encrypted with fresh keys.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-6">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm font-medium">
                Copying variable {progress.current} of {progress.total}...
              </p>
              <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="py-4">
              <label className="mb-2 block text-sm font-medium">
                Copy to
              </label>
              <Select value={targetEnvId} onValueChange={setTargetEnvId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target environment" />
                </SelectTrigger>
                <SelectContent>
                  {targetEnvs.map((env) => (
                    <SelectItem key={env.id} value={env.id}>
                      {env.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCopy} disabled={!targetEnvId || !cryptoKey}>
                <CopyPlus className="mr-2 h-4 w-4" />
                Copy {decryptedVars.length} Variables
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
});
