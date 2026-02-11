"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  LogIn,
  LogOut,
  AlertTriangle,
  LockOpen,
  Lock,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Download,
  Upload,
  Key,
  Users,
  Loader2,
} from "lucide-react";
import { fetchAuditLogs } from "@/lib/actions/audit";
import type { AuditAction } from "@/lib/audit";

type AuditLog = {
  id: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  createdAt: Date;
};

const CATEGORIES: Record<string, AuditAction[]> = {
  Auth: [
    "LOGIN", "LOGOUT", "LOGIN_FAILED", "UNLOCK_VAULT", "UNLOCK_FAILED",
    "LOCK_VAULT", "REGISTER", "ENABLE_2FA", "DISABLE_2FA", "CHANGE_MASTER_PASSWORD",
  ],
  Variables: [
    "CREATE_VARIABLE", "UPDATE_VARIABLE", "DELETE_VARIABLE",
    "CREATE_GLOBAL", "UPDATE_GLOBAL", "DELETE_GLOBAL",
    "EXPORT_ENV", "IMPORT_ENV",
  ],
  Projects: ["CREATE_PROJECT", "UPDATE_PROJECT", "DELETE_PROJECT"],
  Teams: [
    "CREATE_TEAM", "UPDATE_TEAM", "DELETE_TEAM",
    "CREATE_API_TOKEN", "DELETE_API_TOKEN",
  ],
};

const ACTION_CONFIG: Record<string, { label: string; icon: typeof LogIn; color?: string }> = {
  LOGIN: { label: "Logged in", icon: LogIn },
  LOGOUT: { label: "Logged out", icon: LogOut },
  LOGIN_FAILED: { label: "Failed login attempt", icon: AlertTriangle, color: "text-destructive" },
  UNLOCK_VAULT: { label: "Vault unlocked", icon: LockOpen },
  UNLOCK_FAILED: { label: "Failed unlock attempt", icon: AlertTriangle, color: "text-destructive" },
  LOCK_VAULT: { label: "Vault locked", icon: Lock },
  REGISTER: { label: "Account created", icon: Plus },
  ENABLE_2FA: { label: "2FA enabled", icon: Shield },
  DISABLE_2FA: { label: "2FA disabled", icon: Shield, color: "text-yellow-500" },
  CHANGE_MASTER_PASSWORD: { label: "Master password changed", icon: Key },
  CREATE_PROJECT: { label: "Project created", icon: Plus },
  UPDATE_PROJECT: { label: "Project updated", icon: Pencil },
  DELETE_PROJECT: { label: "Project deleted", icon: Trash2, color: "text-destructive" },
  CREATE_VARIABLE: { label: "Variable created", icon: Plus },
  UPDATE_VARIABLE: { label: "Variable updated", icon: Pencil },
  DELETE_VARIABLE: { label: "Variable deleted", icon: Trash2, color: "text-destructive" },
  CREATE_GLOBAL: { label: "Global variable created", icon: Plus },
  UPDATE_GLOBAL: { label: "Global variable updated", icon: Pencil },
  DELETE_GLOBAL: { label: "Global variable deleted", icon: Trash2, color: "text-destructive" },
  EXPORT_ENV: { label: "Environment exported", icon: Download },
  IMPORT_ENV: { label: "Environment imported", icon: Upload },
  CREATE_TEAM: { label: "Team created", icon: Users },
  UPDATE_TEAM: { label: "Team updated", icon: Users },
  DELETE_TEAM: { label: "Team deleted", icon: Users, color: "text-destructive" },
  CREATE_API_TOKEN: { label: "API token created", icon: Key },
  DELETE_API_TOKEN: { label: "API token deleted", icon: Key, color: "text-destructive" },
};

function formatTime(date: Date): string {
  const d = new Date(date);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [category, setCategory] = useState("All");
  const [hasMore, setHasMore] = useState(true);

  const loadLogs = useCallback(async (offset = 0) => {
    try {
      const actions = category !== "All" ? CATEGORIES[category] : undefined;
      const result = await fetchAuditLogs({ limit: 50, offset, actions });
      if (offset === 0) {
        setLogs(result);
      } else {
        setLogs((prev) => [...prev, ...result]);
      }
      setHasMore(result.length === 50);
    } catch {
      // Silently handle
    }
  }, [category]);

  useEffect(() => {
    setIsLoading(true);
    loadLogs(0).finally(() => setIsLoading(false));
  }, [loadLogs]);

  async function handleLoadMore() {
    setIsLoadingMore(true);
    await loadLogs(logs.length);
    setIsLoadingMore(false);
  }

  return (
    <div>
      <Link
        href="/dashboard/settings"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to settings
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Activity Log</h1>
          <p className="text-muted-foreground">Your recent account activity</p>
        </div>
      </div>

      <Tabs value={category} onValueChange={setCategory} className="mb-4">
        <TabsList>
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Auth">Auth</TabsTrigger>
          <TabsTrigger value="Variables">Variables</TabsTrigger>
          <TabsTrigger value="Projects">Projects</TabsTrigger>
          <TabsTrigger value="Teams">Teams</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-md border p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Shield className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {category === "All" ? "No activity yet" : `No ${category.toLowerCase()} activity`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const config = ACTION_CONFIG[log.action] || {
              label: log.action,
              icon: Shield,
            };
            const Icon = config.icon;

            return (
              <div
                key={log.id}
                className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${config.color || ""}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{config.label}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{formatTime(log.createdAt)}</span>
                    {log.resource && (
                      <span className="lowercase">{log.resource.replace("_", " ")}</span>
                    )}
                    {log.ipAddress && (
                      <span>{log.ipAddress}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
