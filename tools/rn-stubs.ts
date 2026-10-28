// Stubs for React Native / Expo modules, so app services that import them can run
// under bun. Use: bun --preload ./tools/rn-stubs.ts tools/<name>.test.ts
import { plugin } from 'bun';
const store = new Map<string, string>();
plugin({
  name: 'rn-stubs',
  setup(build) {
    build.module('@react-native-async-storage/async-storage', () => ({
      exports: { default: {
        getItem: async (k: string) => store.get(k) ?? null,
        setItem: async (k: string, v: string) => void store.set(k, v),
        removeItem: async (k: string) => void store.delete(k),
        multiRemove: async (ks: string[]) => void ks.forEach((k) => store.delete(k)),
      } },
      loader: 'object',
    }));
    build.module('expo-secure-store', () => ({
      exports: {
        getItemAsync: async (k: string) => store.get(k) ?? null,
        setItemAsync: async (k: string, v: string) => void store.set(k, v),
        deleteItemAsync: async (k: string) => void store.delete(k),
      },
      loader: 'object',
    }));
    build.module('react-native', () => ({ exports: { Platform: { OS: 'ios' } }, loader: 'object' }));
  },
});
