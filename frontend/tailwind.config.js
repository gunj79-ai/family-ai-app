/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          500: 'rgb(var(--primary-rgb, 99 102 241) / <alpha-value>)',
          600: 'rgb(var(--primary-rgb, 79 70 229) / <alpha-value>)',
          700: 'rgb(var(--primary-rgb, 67 56 202) / <alpha-value>)',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle:  '#f9fafb',
          muted:   '#f3f4f6',
        },
      },
      backgroundColor: {
        'primary-light': '#f0f4ff',
        'primary-dark': '#1e1b4b',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Cascadia Code', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

