import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  leadRadarOpen: boolean;
  bulkMessagingOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setLeadRadarOpen: (open: boolean) => void;
  setBulkMessagingOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  leadRadarOpen: false,
  bulkMessagingOpen: false,

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setLeadRadarOpen: (open) => set({ leadRadarOpen: open }),
  setBulkMessagingOpen: (open) => set({ bulkMessagingOpen: open }),
}));

