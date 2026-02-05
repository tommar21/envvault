"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  ArrowLeft,
  Key,
  Plus,
  Loader2,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { createApiToken, getApiTokens, deleteApiToken, type ApiPermission } from "@/lib/actions/api-tokens";
import { useConfirm } from "@/hooks/use-confirm";
import { toast } from "sonner";

type ApiToken = Awaited<ReturnType<typeof getApiTokens>>[number];
type NewToken = Awaited<ReturnType<typeof createApiToken>>;

export default function ApiTokensPage() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { confirm, ConfirmDialog } = useConfirm();

  useEffect(() => {
    async function loadTokens() {
      try {
        const data = await getApiTokens();
        setTokens(data);
      } catch {
        toast.error("Failed to load API tokens");
      } finally {
        setIsLoading(false);
      }
    }
    loadTokens();
  }, []);

  async function handleDelete(tokenId: string, tokenName: string) {
    const confirmed = await confirm({
      title: "Delete API Token",
      description: `Delete the token "${tokenName}"? Any applications using this token will stop working.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (!confirmed) return;

    try {
      await deleteApiToken(tokenId);
      setTokens((prev) => prev.filter((t) => t.id !== tokenId));
      toast.success("Token deleted");
    } catch {
      toast.error("Failed to delete token");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Tokens</h1>
            <p className="text-muted-foreground">
              Manage API tokens for programmatic access
            </p>
          </div>
          <CreateTokenDialog
            onSuccess={(token) => {
              setTokens((prev) => [
                {
                  id: token.id,
                  name: token.name,
                  tokenPrefix: token.tokenPrefix,
                  permissions: token.permissions,
                  lastUsedAt: null,
                  expiresAt: token.expiresAt,
                  createdAt: token.createdAt,
                },
                ...prev,
              ]);
            }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tokens.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Key className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No API tokens</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Create an API token to access your secrets programmatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Tokens</CardTitle>
            <CardDescription>
              {tokens.length} token{tokens.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tokens.map((token) => (
                <div
                  key={token.id}
                  className="flex items-center justify-between rounded-md border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{token.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <code className="rounded bg-muted px-1.5 py-0.5">
                        {token.tokenPrefix}...
                      </code>
                      <span>
                        {token.permissions.includes("WRITE")
                          ? "Read & Write"
                          : "Read only"}
                      </span>
                      {token.lastUsedAt && (
                        <span>
                          Last used:{" "}
                          {new Date(token.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                      {token.expiresAt && (
                        <span
                          className={
                            new Date(token.expiresAt) < new Date()
                              ? "text-destructive"
                              : ""
                          }
                        >
                          {new Date(token.expiresAt) < new Date()
                            ? "Expired"
                            : `Expires: ${new Date(token.expiresAt).toLocaleDateString()}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(token.id, token.name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Documentation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>API Usage</CardTitle>
          <CardDescription>
            How to use your API token
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="mb-2 text-sm font-medium">Authentication</p>
            <code className="text-sm">
              Authorization: Bearer sb_your_token_here
            </code>
          </div>
          <div className="rounded-md bg-muted p-4">
            <p className="mb-2 text-sm font-medium">Example: List Projects</p>
            <code className="text-sm">
              curl -H &quot;Authorization: Bearer sb_...&quot; \<br />
              &nbsp;&nbsp;https://mysecretbox.vercel.app/api/v1/projects
            </code>
          </div>
          <p className="text-sm text-muted-foreground">
            Note: Variables are returned encrypted. You need to decrypt them
            client-side with your master password.
          </p>
        </CardContent>
      </Card>

      <ConfirmDialog />
    </div>
  );
}

function CreateTokenDialog({
  onSuccess,
}: {
  onSuccess: (token: NewToken) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newToken, setNewToken] = useState<NewToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [permissions, setPermissions] = useState<ApiPermission[]>(["READ"]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const expiresIn = formData.get("expiresIn") as string;

    let expiresAt: string | null = null;
    if (expiresIn && expiresIn !== "never") {
      const days = parseInt(expiresIn);
      const date = new Date();
      date.setDate(date.getDate() + days);
      expiresAt = date.toISOString();
    }

    try {
      const token = await createApiToken({
        name,
        permissions,
        expiresAt,
      });
      setNewToken(token);
      onSuccess(token);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create token");
    } finally {
      setIsLoading(false);
    }
  }

  function handleCopy() {
    if (newToken?.token) {
      navigator.clipboard.writeText(newToken.token);
      setCopied(true);
      toast.success("Token copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleClose(open: boolean) {
    if (!open) {
      setNewToken(null);
      setCopied(false);
      setPermissions(["READ"]);
    }
    setOpen(open);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Token
        </Button>
      </DialogTrigger>
      <DialogContent>
        {newToken ? (
          <>
            <DialogHeader>
              <DialogTitle>Token Created</DialogTitle>
              <DialogDescription>
                Copy your token now. You won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="mb-4 rounded-md bg-yellow-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 text-yellow-500" />
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    Make sure to copy your token now. For security reasons, it
                    won&apos;t be shown again.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newToken.token}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API Token</DialogTitle>
              <DialogDescription>
                Create a new token for API access.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Token Name
                  </label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="CI/CD Pipeline"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Permissions</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="read"
                        checked={permissions.includes("READ")}
                        disabled
                      />
                      <label htmlFor="read" className="text-sm">
                        Read - View projects and encrypted variables
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="write"
                        checked={permissions.includes("WRITE")}
                        onCheckedChange={(checked) =>
                          setPermissions(
                            checked ? ["READ", "WRITE"] : ["READ"]
                          )
                        }
                      />
                      <label htmlFor="write" className="text-sm">
                        Write - Create and modify projects and variables
                      </label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="expiresIn" className="text-sm font-medium">
                    Expiration
                  </label>
                  <select
                    id="expiresIn"
                    name="expiresIn"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    disabled={isLoading}
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Token
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
