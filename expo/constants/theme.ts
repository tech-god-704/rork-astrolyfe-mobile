import { Platform } from 'react-native';

export const Fonts = {
  display: Platform.select({
    ios: 'Avenir Next',
    android: 'sans-serif',
    web: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    default: 'System',
  }),
  body: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    default: 'System',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    web: 'ui-monospace, SFMono-Regular, monospace',
    default: 'monospace',
  }),
} as const;

export const Radius = {
  control: 12,
  card: 16,
  hero: 24,
  round: 999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 40,
} as const;

export const Motion = {
  fast: 180,
  standard: 260,
  reveal: 420,
} as const;
