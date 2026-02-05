"use client";

import { useState, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Loader2,
  Key,
  Pencil,
  CheckSquare,
  Square,
} from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";
import { encryptVariable, decryptVariable } from "@/lib/crypto/encryption";
import {
  createGlobalVariable,
  deleteGlobalVariable,
  updateGlobalVariable,
} from "@/lib/actions/variables";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { GlobalVariable, ProjectGlobal, Project } from "@prisma/client";

type GlobalWithProjects = GlobalVariable & {
  projects: (ProjectGlobal & { project: Project })[];
};

interface GlobalsViewProps {
  globals: GlobalWithProjects[];
}

interface DecryptedGlobal {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  linkedProjects: string[];
}

export function GlobalsView({ globals }: GlobalsViewProps) {
  const cryptoKey = useVaultStore((state) => state.cryptoKey);
  const [decryptedGlobals, setDecryptedGlobals] = useState<DecryptedGlobal[]>([]);
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVars, setSelectedVars] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [editingVar, setEditingVar] = useState<DecryptedGlobal | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  // Decrypt globals on mount
  useEffect(() => {
    async function decryptAll() {
      if (!cryptoKey || globals.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const decrypted = await Promise.all(
          globals.map(async (g) => {
            const { key, value } = await decryptVariable(
              g.keyEncrypted,
              g.valueEncrypted,
              g.ivKey,
              g.ivValue,
              cryptoKey
            );
            return {
              id: g.id,
              key,
              value,
              isSecret: g.isSecret,
              linkedProjects: g.projects.map((p) => p.project.name),
            };
          })
        );
        setDecryptedGlobals(decrypted);
      } catch (error) {
        logger.error("Failed to decrypt globals", error);
        toast.error("Failed to decrypt global variables");
      } finally {
        setIsLoading(false);
      }
    }

    decryptAll();
  }, [cryptoKey, globals]);

  function toggleValueVisibility(varId: string) {
    setVisibleValues((prev) => {
      const next = new Set(prev);
      if (next.has(varId)) {
        next.delete(varId);
      } else {
        next.add(varId);
      }
      return next;
    });
  }

  const copyToClipboard = useCallback((value: string) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy to clipboard"));
  }, []);

  async function handleDelete(id: string) {
    const confirmed = await confirm({
      title: "Delete Global Variable",
      description: "Delete this global variable? It will be unlinked from all projects.",
      confirmText: "Delete",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await deleteGlobalVariable(id);
      setDecryptedGlobals((prev) => prev.filter((g) => g.id !== id));
      toast.success("Global variable deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  function toggleSelection(varId: string) {
    setSelectedVars((prev) => {
      const next = new Set(prev);
      if (next.has(varId)) {
        next.delete(varId);
      } else {
        next.add(varId);
      }
      return next;
    });
  }

  function selectAll() {
    setSelectedVars(new Set(decryptedGlobals.map((v) => v.id)));
  }

  function clearSelection() {
    setSelectedVars(new Set());
  }

  async function handleBulkDelete() {
    if (selectedVars.size === 0) return;

    const confirmed = await confirm({
      title: "Delete Global Variables",
      description: `Delete ${selectedVars.size} global variable${selectedVars.size > 1 ? "s" : ""}? They will be unlinked from all projects.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedVars).map((id) => deleteGlobalVariable(id))
      );
      setDecryptedGlobals((prev) => prev.filter((g) => !selectedVars.has(g.id)));
      setSelectedVars(new Set());
      toast.success(`Deleted ${selectedVars.size} variable${selectedVars.size > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to delete some variables");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function handleUpdate(updated: DecryptedGlobal) {
    setDecryptedGlobals((prev) =>
      prev.map((g) => (g.id === updated.id ? updated : g))
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Global Variables</h1>
          <p className="text-muted-foreground">
            Variables shared across all your projects
          </p>
        </div>
        <AddGlobalDialog
          cryptoKey={cryptoKey}
          onSuccess={(newGlobal) => {
            setDecryptedGlobals((prev) => [newGlobal, ...prev]);
          }}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : decryptedGlobals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Key className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No global variables</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Global variables are shared across all projects.
              <br />
              Great for API keys you use everywhere.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Global Variables</CardTitle>
                <CardDescription>
                  {decryptedGlobals.length} variable
                  {decryptedGlobals.length !== 1 ? "s" : ""}
                </CardDescription>
              </div>
              {/* Bulk Actions Bar */}
              <div className="flex items-center gap-2">
                {selectedVars.size > 0 ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      {selectedVars.size} selected
                    </span>
                    <Button variant="outline" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={isBulkDeleting}
                    >
                      {isBulkDeleting && (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      )}
                      Delete Selected
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={selectAll}>
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Select All
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decryptedGlobals.map((variable) => (
                <div
                  key={variable.id}
                  className={`flex items-center gap-4 rounded-md border p-3 transition-colors ${
                    selectedVars.has(variable.id) ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => toggleSelection(variable.id)}
                  >
                    {selectedVars.has(variable.id) ? (
                      <CheckSquare className="h-4 w-4 text-primary" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                  <div className="min-w-0 flex-1">
                    <code className="text-sm font-medium">{variable.key}</code>
                    {variable.linkedProjects.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Used in: {variable.linkedProjects.join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <code className="text-sm text-muted-foreground">
                      {variable.isSecret && !visibleValues.has(variable.id)
                        ? "••••••••••••"
                        : variable.value}
                    </code>
                  </div>
                  <div className="flex items-center gap-1">
                    {variable.isSecret && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleValueVisibility(variable.id)}
                      >
                        {visibleValues.has(variable.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(variable.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingVar(variable)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(variable.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <EditGlobalDialog
        open={!!editingVar}
        onOpenChange={(open) => !open && setEditingVar(null)}
        variable={editingVar}
        cryptoKey={cryptoKey}
        onSuccess={(updated) => {
          handleUpdate(updated);
          setEditingVar(null);
        }}
      />

      <ConfirmDialog />
    </div>
  );
}

const EditGlobalDialog = memo(function EditGlobalDialog({
  open,
  onOpenChange,
  variable,
  cryptoKey,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable: DecryptedGlobal | null;
  cryptoKey: CryptoKey | null;
  onSuccess: (updated: DecryptedGlobal) => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);

  // Reset form when dialog opens with new variable
  useEffect(() => {
    if (open && variable) {
      setKey(variable.key);
      setValue(variable.value);
      setIsSecret(variable.isSecret);
    }
  }, [open, variable]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cryptoKey || !variable) return;

    setIsLoading(true);

    try {
      const encrypted = await encryptVariable(key, value, cryptoKey);

      await updateGlobalVariable(variable.id, {
        ...encrypted,
        isSecret,
      });

      toast.success("Global variable updated");
      onOpenChange(false);
      onSuccess({
        id: variable.id,
        key,
        value,
        isSecret,
        linkedProjects: variable.linkedProjects,
      });
    } catch (error) {
      logger.error("Failed to update global variable", error);
      toast.error("Failed to update global variable");
    } finally {
      setIsLoading(false);
    }
  }

  if (!variable) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Global Variable</DialogTitle>
          <DialogDescription>
            Update the global variable. Changes will be encrypted before saving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="edit-global-key" className="text-sm font-medium">
                Key
              </label>
              <Input
                id="edit-global-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="OPENAI_API_KEY"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-global-value" className="text-sm font-medium">
                Value
              </label>
              <Input
                id="edit-global-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="sk-..."
                required
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-global-isSecret"
                checked={isSecret}
                onChange={(e) => setIsSecret(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="edit-global-isSecret" className="text-sm">
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

const AddGlobalDialog = memo(function AddGlobalDialog({
  cryptoKey,
  onSuccess,
}: {
  cryptoKey: CryptoKey | null;
  onSuccess: (global: DecryptedGlobal) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cryptoKey) return;

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const key = formData.get("key") as string;
    const value = formData.get("value") as string;
    const isSecret = formData.get("isSecret") === "on";

    try {
      const encrypted = await encryptVariable(key, value, cryptoKey);

      const created = await createGlobalVariable({
        ...encrypted,
        isSecret,
      });

      toast.success("Global variable added");
      setOpen(false);
      onSuccess({
        id: created.id,
        key,
        value,
        isSecret,
        linkedProjects: [],
      });
    } catch (error) {
      logger.error("Failed to add global variable", error);
      toast.error("Failed to add global variable");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Global Variable
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Global Variable</DialogTitle>
          <DialogDescription>
            Global variables can be linked to multiple projects.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="key" className="text-sm font-medium">
                Key
              </label>
              <Input
                id="key"
                name="key"
                placeholder="OPENAI_API_KEY"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="value" className="text-sm font-medium">
                Value
              </label>
              <Input
                id="value"
                name="value"
                placeholder="sk-..."
                required
                disabled={isLoading}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isSecret"
                name="isSecret"
                className="h-4 w-4"
                defaultChecked
              />
              <label htmlFor="isSecret" className="text-sm">
                Mark as secret (hide value by default)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !cryptoKey}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Global Variable
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
