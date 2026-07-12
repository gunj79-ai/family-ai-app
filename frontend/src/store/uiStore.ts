import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  activeProjectId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveProject: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activeProjectId: null,
  toggleSidebar:    () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen:   (open) => set({ sidebarOpen: open }),
  setActiveProject: (id)   => set({ activeProjectId: id }),
}));
