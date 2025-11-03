import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2563eb',
          foreground: '#ffffff'
        },
        success: '#22c55e',
        warning: '#f97316',
        danger: '#ef4444'
      }
    }
  },
  plugins: []
};

export default config;
