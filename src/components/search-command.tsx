"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  FolderKey,
  Key,
  Settings,
  Plus,
  Lock,
  Search,
  Globe,
} from "lucide-react";
import { useVaultStore } from "@/stores/vault-store";

interface SearchCommandProps {
  projects?: Array<{ id: string; name: string }>;
}

export function SearchCommand({ projects = [] }: SearchCommandProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const lock = useVaultStore((state) => state.lock);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }

      // Cmd+L to lock
      if (e.key === "l" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        lock();
      }

      // Cmd+N for new project
      if (e.key === "n" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        router.push("/dashboard/projects/new");
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [lock, router]);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:w-64"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects, actions..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard/projects/new"))}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Project
              <kbd className="ml-auto text-xs text-muted-foreground">⌘N</kbd>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => lock())}>
              <Lock className="mr-2 h-4 w-4" />
              Lock Vault
              <kbd className="ml-auto text-xs text-muted-foreground">⌘L</kbd>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard/globals"))}
            >
              <Globe className="mr-2 h-4 w-4" />
              Global Variables
            </CommandItem>
          </CommandGroup>

          {projects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Projects">
                {projects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() =>
                      runCommand(() => router.push(`/dashboard/projects/${project.id}`))
                    }
                  >
                    <FolderKey className="mr-2 h-4 w-4" />
                    {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Help">
            <CommandItem disabled>
              <Key className="mr-2 h-4 w-4" />
              <span className="text-muted-foreground">
                Press <kbd className="mx-1 rounded border px-1">?</kbd> for keyboard
                shortcuts
              </span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
