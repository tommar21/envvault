import { create } from "zustand";
import { deriveKey } from "@/lib/crypto/encryption";
import type {
  VaultState,
  DecryptedProject,
  DecryptedGlobalVariable,
} from "@/types";

export const useVaultStore = create<VaultState>((set, _get) => ({
  // Initial state
  isUnlocked: false,
  isLoading: false,
  cryptoKey: null,
  projects: [],
  globalVariables: [],
  autoLockMinutes: 5,

  // Set auto-lock timeout
  setAutoLockMinutes: (minutes: number) => {
    set({ autoLockMinutes: minutes });
    // Reset timer with new duration
    resetInactivityTimer();
  },

  // Unlock the vault with master password
  unlock: async (masterPassword: string, salt: string) => {
    set({ isLoading: true });
    try {
      const key = await deriveKey(masterPassword, salt);
      set({ cryptoKey: key, isUnlocked: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  // Lock the vault (clear the key from memory)
  lock: () => {
    set({
      isUnlocked: false,
      cryptoKey: null,
      projects: [],
      globalVariables: [],
    });
  },

  // Set all projects
  setProjects: (projects: DecryptedProject[]) => {
    set({ projects });
  },

  // Set all global variables
  setGlobalVariables: (globals: DecryptedGlobalVariable[]) => {
    set({ globalVariables: globals });
  },

  // Add a new project
  addProject: (project: DecryptedProject) => {
    set((state) => ({ projects: [...state.projects, project] }));
  },

  // Update a project
  updateProject: (id: string, updates: Partial<DecryptedProject>) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    }));
  },

  // Delete a project
  deleteProject: (id: string) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
    }));
  },

  // Add a global variable
  addGlobalVariable: (variable: DecryptedGlobalVariable) => {
    set((state) => ({
      globalVariables: [...state.globalVariables, variable],
    }));
  },

  // Update a global variable
  updateGlobalVariable: (
    id: string,
    updates: Partial<DecryptedGlobalVariable>
  ) => {
    set((state) => ({
      globalVariables: state.globalVariables.map((v) =>
        v.id === id ? { ...v, ...updates } : v
      ),
    }));
  },

  // Delete a global variable
  deleteGlobalVariable: (id: string) => {
    set((state) => ({
      globalVariables: state.globalVariables.filter((v) => v.id !== id),
    }));
  },
}));

// Auto-lock after inactivity
let inactivityTimer: NodeJS.Timeout | null = null;

export function resetInactivityTimer() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  const state = useVaultStore.getState();
  if (state.isUnlocked) {
    const timeout = state.autoLockMinutes * 60 * 1000;
    inactivityTimer = setTimeout(() => {
      useVaultStore.getState().lock();
    }, timeout);
  }
}

// Setup activity listeners (call once on app mount)
export function setupInactivityListeners() {
  if (typeof window === "undefined") return;

  const events = ["mousedown", "keydown", "scroll", "touchstart"];
  events.forEach((event) => {
    window.addEventListener(event, resetInactivityTimer);
  });

  return () => {
    events.forEach((event) => {
      window.removeEventListener(event, resetInactivityTimer);
    });
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
  };
}
