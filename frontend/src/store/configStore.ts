import { create } from 'zustand';

interface AppConfig {
  appName: string;
  appTagline: string;
  primaryColor: string;
  setupComplete: boolean;
  loaded: boolean;
}

interface ConfigState extends AppConfig {
  load: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  appName: 'FamilyAI',
  appTagline: 'Your private family AI assistant',
  primaryColor: '#6366f1',
  setupComplete: true,
  loaded: false,

  load: async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) return;
      const data = (await res.json()) as AppConfig;

      // Apply primary color as CSS custom property
      document.documentElement.style.setProperty(
        '--color-primary',
        data.primaryColor || '#6366f1'
      );

      // Set document title
      document.title = data.appName || 'FamilyAI';

      set({ ...data, loaded: true });
    } catch {
      // Fail gracefully, use defaults
      set({ loaded: true });
    }
  },
}));
