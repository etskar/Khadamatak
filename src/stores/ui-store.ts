"use client";

import { create } from "zustand";

type UiState = {
  sidebarCollapsed: boolean;
  createPostOpen: boolean;
  mobileMenuOpen: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
  setCreatePostOpen: (value: boolean) => void;
  setMobileMenuOpen: (value: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  createPostOpen: false,
  mobileMenuOpen: false,
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCreatePostOpen: (value) => set({ createPostOpen: value }),
  setMobileMenuOpen: (value) => set({ mobileMenuOpen: value }),
}));
