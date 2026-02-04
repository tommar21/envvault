"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";
import { encryptVariable, decryptVariable } from "@/lib/crypto/encryption";
import { createVariable, deleteVariable } from "@/lib/actions/variables";
import { deleteProject } from "@/lib/actions/projects";
import { toast } from "sonner";
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
      console.error("Failed to decrypt variables:", error);
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
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProject(project.id);
      toast.success("Project deleted");
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
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

  function copyToClipboard(value: string) {
    navigator.clipboard.writeText(value);
    toast.success("Copied to clipboard");
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
          <AddVariableDialog
            environmentId={activeEnv}
            cryptoKey={cryptoKey}
            onSuccess={() => {
              // Clear cache to force re-fetch
              setDecryptedVars((prev) => {
                const next = { ...prev };
                delete next[activeEnv];
                return next;
              });
            }}
          />
        </div>

        {project.environments.map((env) => (
          <TabsContent key={env.id} value={env.id}>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{env.name}</CardTitle>
                <CardDescription>
                  {decryptedVars[env.id]?.length || 0} variables
                </CardDescription>
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
                        isVisible={visibleValues.has(variable.id)}
                        onToggleVisibility={() => toggleValueVisibility(variable.id)}
                        onCopy={() => copyToClipboard(variable.value)}
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
    </div>
  );
}

function VariableRow({
  variable,
  isVisible,
  onToggleVisibility,
  onCopy,
  onDelete,
}: {
  variable: DecryptedVar;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onCopy: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-md border p-3">
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
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function AddVariableDialog({
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
      console.error(error);
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
}

function ExportButton({
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
      let content = `# Generated by EnvVault\n`;
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
      console.error(error);
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
}
