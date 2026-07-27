/**
 * Local cache for generated forecasts.
 *
 * Daily generation is fast enough to run on demand, but a monthly forecast samples fifteen
 * skies and every one of those computes ten bodies — worth doing once per period rather
 * than on every render or tab switch.
 *
 * Keys carry an engine version and a chart fingerprint, never an email address: a cache
 * key ends up in device storage and in any debugging output, and there is no reason for
 * personal data to be in either.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENGINE_VERSION } from '@/data/horoscope/interpretations';

const PREFIX = 'astrolyfe:horoscope';

/**
 * Non-reversible fingerprint of the inputs that change a chart.
 *
 * Changing birth time, place or date produces a different fingerprint, which invalidates
 * the cache for free — no explicit "clear the cache when the profile changes" wiring to
 * forget.
 */
export function chartFingerprint(parts: {
  birthDate?: string | null;
  hour?: number | null;
  minute?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  sign?: string | null;
}): string {
  const input = [
    parts.birthDate ?? '',
    parts.hour ?? '',
    parts.minute ?? '',
    parts.latitude ?? '',
    parts.longitude ?? '',
    parts.sign ?? '',
  ].join('|');

  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761) >>> 0;
    h2 = Math.imul(h2 ^ ch, 1597334677) >>> 0;
  }
  return (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36);
}

export function cacheKey(fingerprint: string, period: string, periodStart: string): string {
  return `${PREFIX}:${ENGINE_VERSION}:${fingerprint}:${period}:${periodStart}`;
}

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // A malformed entry is treated as a miss rather than crashing the screen.
    return parsed && typeof parsed === 'object' ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full or unavailable store costs a recomputation, nothing more.
  }
}

/**
 * Drop this engine's entries. Stale keys from older engine versions are left alone —
 * they are already unreachable and removing them is not worth a full key scan on launch.
 */
export async function clearForecastCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(`${PREFIX}:${ENGINE_VERSION}:`));
    if (mine.length > 0) await AsyncStorage.multiRemove(mine);
  } catch {
    // Non-fatal: the cache is an optimisation.
  }
}
