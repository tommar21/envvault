"use client";

import { useState, memo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Plus,
  Download,
  Trash2,
  MoreVertical,
  Eye,
  EyeOff,
  Copy,
  Loader2,
  Pencil,
  CheckSquare,
  Square,
} from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";
import { encryptVariable, decryptVariable } from "@/lib/crypto/encryption";
import { createVariable, deleteVariable, updateVariable } from "@/lib/actions/variables";
import { deleteProject } from "@/lib/actions/projects";
import { ImportEnvDialog } from "@/components/import-env-dialog";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import type { Variable, Environment, Project, GlobalVariable, ProjectGlobal } from "@prisma/client";

type ProjectWithRelations = Project & {
  environments: (Environment & { variables: Variable[] })[];
  linkedGlobals: (ProjectGlobal & { global: GlobalVariable })[];
};

interface ProjectViewProps {
  project: ProjectWithRelations;
}

interface DecryptedVar {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export function ProjectView({ project }: ProjectViewProps) {
  const router = useRouter();
  const cryptoKey = useVaultStore((state) => state.cryptoKey);
  const [activeEnv, setActiveEnv] = useState(project.environments[0]?.id || "");
  const [decryptedVars, setDecryptedVars] = useState<Record<string, DecryptedVar[]>>({});
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedVars, setSelectedVars] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  // Decrypt variables for an environment
  async function decryptEnvVariables(envId: string) {
    if (!cryptoKey || decryptedVars[envId]) return;

    const env = project.environments.find((e) => e.id === envId);
    if (!env) return;

    try {
      const decrypted = await Promise.all(
        env.variables.map(async (v) => {
          const { key, value } = await decryptVariable(
            v.keyEncrypted,
            v.valueEncrypted,
            v.ivKey,
            v.ivValue,
            cryptoKey
          );
          return { id: v.id, key, value, isSecret: v.isSecret };
        })
      );

      setDecryptedVars((prev) => ({ ...prev, [envId]: decrypted }));
    } catch (error) {
      logger.error("Failed to decrypt variables", error);
      toast.error("Failed to decrypt variables");
    }
  }

  // Load variables when tab changes
  function handleTabChange(envId: string) {
    setActiveEnv(envId);
    decryptEnvVariables(envId);
  }

  // Initialize first tab
  if (activeEnv && !decryptedVars[activeEnv] && cryptoKey) {
    decryptEnvVariables(activeEnv);
  }

  async function handleDeleteProject() {
    const confirmed = await confirm({
      title: "Delete Project",
      description: "Are you sure you want to delete this project? This action cannot be undone.",
      confirmText: "Delete",
      variant: "destructive",
    });

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      router.push("/dashboard");
    } catch (error) {
      logger.error("Failed to delete project", error);
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  }

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
    const currentVars = decryptedVars[activeEnv] || [];
    setSelectedVars(new Set(currentVars.map((v) => v.id)));
  }

  function clearSelection() {
    setSelectedVars(new Set());
  }

  async function handleBulkDelete() {
    if (selectedVars.size === 0) return;

    const confirmed = await confirm({
      title: "Delete Variables",
      description: `Are you sure you want to delete ${selectedVars.size} variable${selectedVars.size > 1 ? "s" : ""}? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedVars).map((id) => deleteVariable(id))
      );
      setDecryptedVars((prev) => ({
        ...prev,
        [activeEnv]: prev[activeEnv].filter((v) => !selectedVars.has(v.id)),
      }));
      setSelectedVars(new Set());
      toast.success(`Deleted ${selectedVars.size} variable${selectedVars.size > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to delete some variables");
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function handleVariableUpdate(envId: string, updatedVar: DecryptedVar) {
    setDecryptedVars((prev) => ({
      ...prev,
      [envId]: prev[envId].map((v) => (v.id === updatedVar.id ? updatedVar : v)),
    }));
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to projects
          </Link>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.path && (
            <p className="text-sm text-muted-foreground">{project.path}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ExportButton project={project} decryptedVars={decryptedVars} activeEnv={activeEnv} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDeleteProject}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Environment Tabs */}
      <Tabs value={activeEnv} onValueChange={handleTabChange}>
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            {project.environments.map((env) => (
              <TabsTrigger key={env.id} value={env.id}>
                {env.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2">
            <ImportEnvDialog
              environmentId={activeEnv}
              cryptoKey={cryptoKey}
              onSuccess={() => {
                setDecryptedVars((prev) => {
                  const next = { ...prev };
                  delete next[activeEnv];
                  return next;
                });
              }}
            />
            <AddVariableDialog
              environmentId={activeEnv}
              cryptoKey={cryptoKey}
              onSuccess={() => {
                setDecryptedVars((prev) => {
                  const next = { ...prev };
                  delete next[activeEnv];
                  return next;
                });
              }}
            />
          </div>
        </div>

        {project.environments.map((env) => (
          <TabsContent key={env.id} value={env.id}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{env.name}</CardTitle>
                    <CardDescription>
                      {decryptedVars[env.id]?.length || 0} variables
                    </CardDescription>
                  </div>
                  {/* Bulk Actions Bar */}
                  {decryptedVars[env.id]?.length > 0 && (
                    <div className="flex items-center gap-2">
                      {selectedVars.size > 0 ? (
                        <>
                          <span className="text-sm text-muted-foreground">
                            {selectedVars.size} selected
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearSelection}
                          >
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={selectAll}
                        >
                          <CheckSquare className="mr-2 h-4 w-4" />
                          Select All
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!decryptedVars[env.id] ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : decryptedVars[env.id].length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">
                    No variables yet. Add your first variable above.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {decryptedVars[env.id].map((variable) => (
                      <VariableRow
                        key={variable.id}
                        variable={variable}
                        envId={env.id}
                        cryptoKey={cryptoKey}
                        isVisible={visibleValues.has(variable.id)}
                        isSelected={selectedVars.has(variable.id)}
                        onToggleVisibility={() => toggleValueVisibility(variable.id)}
                        onToggleSelection={() => toggleSelection(variable.id)}
                        onCopy={() => copyToClipboard(variable.value)}
                        onUpdate={(updated) => handleVariableUpdate(env.id, updated)}
                        onDelete={async () => {
                          try {
                            await deleteVariable(variable.id);
                            setDecryptedVars((prev) => ({
                              ...prev,
                              [env.id]: prev[env.id].filter((v) => v.id !== variable.id),
                            }));
                            toast.success("Variable deleted");
                          } catch {
                            toast.error("Failed to delete variable");
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <ConfirmDialog />
    </div>
  );
}

const VariableRow = memo(function VariableRow({
  variable,
  envId,
  cryptoKey,
  isVisible,
  isSelected,
  onToggleVisibility,
  onToggleSelection,
  onCopy,
  onUpdate,
  onDelete,
}: {
  variable: DecryptedVar;
  envId: string;
  cryptoKey: CryptoKey | null;
  isVisible: boolean;
  isSelected: boolean;
  onToggleVisibility: () => void;
  onToggleSelection: () => void;
  onCopy: () => void;
  onUpdate: (updated: DecryptedVar) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <div
        className={`flex items-center gap-4 rounded-md border p-3 transition-colors ${
          isSelected ? "border-primary bg-primary/5" : ""
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onToggleSelection}
        >
          {isSelected ? (
            <CheckSquare className="h-4 w-4 text-primary" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>
        <div className="min-w-0 flex-1">
          <code className="text-sm font-medium">{variable.key}</code>
        </div>
        <div className="min-w-0 flex-1">
          <code className="text-sm text-muted-foreground">
            {variable.isSecret && !isVisible
              ? "••••••••••••"
              : isVisible || !variable.isSecret
              ? variable.value
              : "••••••••••••"}
          </code>
        </div>
        <div className="flex items-center gap-1">
          {variable.isSecret && (
            <Button variant="ghost" size="icon" onClick={onToggleVisibility}>
              {isVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      <EditVariableDialog
        open={isEditing}
        onOpenChange={setIsEditing}
        variable={variable}
        cryptoKey={cryptoKey}
        onSuccess={onUpdate}
      />
    </>
  );
});

const EditVariableDialog = memo(function EditVariableDialog({
  open,
  onOpenChange,
  variable,
  cryptoKey,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable: DecryptedVar;
  cryptoKey: CryptoKey | null;
  onSuccess: (updated: DecryptedVar) => void;
}) {
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

const AddVariableDialog = memo(function AddVariableDialog({
  environmentId,
  cryptoKey,
  onSuccess,
}: {
  environmentId: string;
  cryptoKey: CryptoKey | null;
  onSuccess: () => void;
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

      await createVariable(environmentId, {
        ...encrypted,
        isSecret,
      });

      toast.success("Variable added");
      setOpen(false);
      onSuccess();
    } catch (error) {
      logger.error("Failed to add variable", error);
      toast.error("Failed to add variable");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Variable
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Variable</DialogTitle>
          <DialogDescription>
            Add a new environment variable. It will be encrypted before saving.
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
                placeholder="DATABASE_URL"
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
                placeholder="postgresql://..."
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
              />
              <label htmlFor="isSecret" className="text-sm">
                Mark as secret (hide value by default)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !cryptoKey}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Variable
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

const ExportButton = memo(function ExportButton({
  project,
  decryptedVars,
  activeEnv,
}: {
  project: ProjectWithRelations;
  decryptedVars: Record<string, DecryptedVar[]>;
  activeEnv: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    const vars = decryptedVars[activeEnv];
    if (!vars) return;

    setIsExporting(true);

    try {
      const env = project.environments.find((e) => e.id === activeEnv);
      const envName = env?.name || "unknown";

      // Generate .env content
      let content = `# Generated by SecretBox\n`;
      content += `# Project: ${project.name} | Environment: ${envName}\n`;
      content += `# Date: ${new Date().toISOString()}\n\n`;

      for (const v of vars) {
        content += `${v.key}="${v.value}"\n`;
      }

      // Download file
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `.env.${envName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Exported successfully");
    } catch (error) {
      logger.error("Failed to export", error);
      toast.error("Failed to export");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Export .env
    </Button>
  );
});
