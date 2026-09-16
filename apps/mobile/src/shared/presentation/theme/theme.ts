import { defineThemes } from 'stylo-native';

export interface AppTheme {
  colors: { bg: string; fg: string; muted: string; ok: string; fail: string };
  space: { sm: number; md: number; lg: number };
}

declare module 'stylo-native' {
  interface StyloTheme extends AppTheme {}
}

const light = {
  colors: { bg: '#ffffff', fg: '#111111', muted: '#6b7280', ok: '#16a34a', fail: '#dc2626' },
  space: { sm: 4, md: 8, lg: 16 },
} satisfies AppTheme;

const dark = {
  colors: { bg: '#000000', fg: '#eeeeee', muted: '#9ca3af', ok: '#4ade80', fail: '#f87171' },
  space: { sm: 4, md: 8, lg: 16 },
} satisfies AppTheme;

export const { handles, store } = defineThemes({ light, dark }, 'light');
