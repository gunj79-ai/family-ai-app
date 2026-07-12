import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { apiClient } from '@/api/client';

/**
 * Converts hex color to RGB values
 * @example hexToRgb('#6366f1') => '99 102 241'
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '99 102 241';
}

export function useTheme() {
  const { settings } = useAuthStore();
  const theme = settings?.theme || 'system';

  // Load and apply primary color from server
  useEffect(() => {
    apiClient
      .get('/admin/settings')
      .then((res) => {
        const primaryColor = res.data.primary_color || '#6366f1';
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--primary-rgb', hexToRgb(primaryColor));
      })
      .catch(() => {
        document.documentElement.style.setProperty('--primary-color', '#6366f1');
        document.documentElement.style.setProperty('--primary-rgb', '99 102 241');
      });
  }, []);

  // Apply theme preference
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else if (theme === 'light') {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.style.colorScheme = 'auto';
    }
  }, [theme]);

  return theme;
}
