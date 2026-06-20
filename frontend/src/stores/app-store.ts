import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace } from "@/types";

interface AppState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  searchOverlayOpen: boolean;
  activeWorkspaceId: string;
  workspaces: Workspace[];
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setSearchOverlayOpen: (open: boolean) => void;
  setActiveWorkspace: (id: string) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      searchOverlayOpen: false,
      activeWorkspaceId: "",
      workspaces: [],
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      setSearchOverlayOpen: (open) => set({ searchOverlayOpen: open }),
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setWorkspaces: (workspaces) => set({ workspaces }),
    }),
    { name: "researchmind-app" }
  )
);
