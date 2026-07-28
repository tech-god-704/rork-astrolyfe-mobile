import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyTheme, type ThemeName } from '@/constants/colors';

/**
 * Theme preference: device-local only, deliberately not synced to the account.
 *
 * Unlike notification preferences, nothing server-side ever needs to know which theme
 * a customer prefers — it is a pure rendering choice, so it doesn't belong in
 * PocketBase. AsyncStorage is the whole persistence layer.
 */

const STORAGE_KEY = 'astrolyfe:theme';
const DEFAULT_THEME: ThemeName = 'dark';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  isReady: boolean;
}

// Exported so ErrorBoundary (a class component — error boundaries must be, since only
// classes support getDerivedStateFromError/componentDidCatch) can read it via
// `static contextType`, the only way a class component can consume context; hooks like
// useTheme() below are function-component-only.
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        const resolved: ThemeName = stored === 'light' ? 'light' : DEFAULT_THEME;
        applyTheme(resolved);
        setThemeState(resolved);
      })
      .catch(() => {
        applyTheme(DEFAULT_THEME);
      })
      .finally(() => {
        if (!cancelled) setIsReady(true);
      });
    return () => { cancelled = true; };
  }, []);

  const setTheme = useCallback((next: ThemeName) => {
    applyTheme(next);
    setThemeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {
      // Preference falls back to the default next launch; not worth surfacing to the
      // customer over a settings write that can simply be retried by toggling again.
    });
  }, []);

  const value = useMemo(() => ({ theme, setTheme, isReady }), [theme, setTheme, isReady]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Every screen defines its styles with `StyleSheet.create({...})` at module scope,
 * which JS evaluates exactly once when the file first loads — any `Colors.xxx`
 * reference inside is frozen into a plain string at that moment. Mutating the shared
 * Colors object later (see applyTheme in constants/colors.ts) does not reach an
 * already-created style object.
 *
 * This re-runs the factory in a useMemo keyed on the current theme, so the exact same
 * StyleSheet.create({...}) call any screen already has just needs wrapping in a
 * function — no individual Colors.xxx reference needs to change. Subscribing to
 * useTheme() here is also what makes the calling component re-render on a theme
 * change in the first place; components that read Colors without this hook (or a
 * direct useTheme() call) would not re-render when the preference changes.
 */
export function useThemedStyles<T>(factory: () => T): T {
  const { theme } = useTheme();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on
  // theme only; factory is a fresh closure every render by design.
  return useMemo(factory, [theme]);
}
