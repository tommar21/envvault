"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";
import { encryptVariable, decryptVariable } from "@/lib/crypto/encryption";
import {
  createGlobalVariable,
  deleteGlobalVariable,
} from "@/lib/actions/variables";
import { toast } from "sonner";
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
        console.error("Failed to decrypt globals:", error);
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

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this global variable? It will be unlinked from all projects.")) {
      return;
    }

    try {
      await deleteGlobalVariable(id);
      setDecryptedGlobals((prev) => prev.filter((g) => g.id !== id));
      toast.success("Global variable deleted");
    } catch {
      toast.error("Failed to delete");
    }
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
            <CardTitle>All Global Variables</CardTitle>
            <CardDescription>
              {decryptedGlobals.length} variable
              {decryptedGlobals.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {decryptedGlobals.map((variable) => (
                <div
                  key={variable.id}
                  className="flex items-center gap-4 rounded-md border p-3"
                >
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
    </div>
  );
}

function AddGlobalDialog({
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
      console.error(error);
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
}
