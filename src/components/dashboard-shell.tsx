"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, LogOut, Settings, FolderKey, Key, LockOpen, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VaultProvider } from "./vault-provider";
import { useVaultStore } from "@/stores/vault-store";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface DashboardShellProps {
  children: React.ReactNode;
  user: {
    name?: string | null;
    email?: string | null;
  };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile header */}
      <div className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          <span className="font-bold">SecretBox</span>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <VaultProvider>
          <div className="container mx-auto p-4 md:p-6">{children}</div>
        </VaultProvider>
      </main>
    </div>
  );
}

function Sidebar({
  user,
  isOpen,
  onClose,
}: {
  user: { name?: string | null; email?: string | null };
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const lock = useVaultStore((state) => state.lock);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 border-r bg-background transition-transform md:static md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-14 items-center justify-between gap-2 border-b px-4 md:h-16">
          <div className="flex items-center gap-2">
            <Lock className="h-6 w-6" />
            <span className="text-xl font-bold">SecretBox</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          <NavLink
            href="/dashboard"
            icon={<FolderKey className="h-4 w-4" />}
            isActive={pathname === "/dashboard"}
            onClick={onClose}
          >
            Projects
          </NavLink>
          <NavLink
            href="/dashboard/globals"
            icon={<Key className="h-4 w-4" />}
            isActive={pathname === "/dashboard/globals"}
            onClick={onClose}
          >
            Global Variables
          </NavLink>
          <NavLink
            href="/dashboard/settings"
            icon={<Settings className="h-4 w-4" />}
            isActive={pathname === "/dashboard/settings"}
            onClick={onClose}
          >
            Settings
          </NavLink>
        </nav>

        {/* Vault status */}
        {isUnlocked && (
          <div className="border-t p-4">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => lock()}
            >
              <LockOpen className="h-4 w-4" />
              Lock Vault
            </Button>
          </div>
        )}

        {/* User */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.email}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon,
  children,
  isActive,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
