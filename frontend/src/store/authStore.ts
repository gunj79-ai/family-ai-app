import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserSettings } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  settings: UserSettings | null;
  setAuth: (user: User, token: string, settings: UserSettings) => void;
  updateSettings: (s: Partial<UserSettings>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      settings: null,
      setAuth: (user, token, settings) => {
        localStorage.setItem('familyai_token', token);
        set({ user, token, settings });
      },
      updateSettings: (s) =>
        set((state) => ({ settings: state.settings ? { ...state.settings, ...s } : null })),
      logout: () => {
        localStorage.removeItem('familyai_token');
        set({ user: null, token: null, settings: null });
      },
    }),
    {
      name: 'familyai-auth',
      partialize: (s) => ({ user: s.user, token: s.token, settings: s.settings }),
    }
  )
);
