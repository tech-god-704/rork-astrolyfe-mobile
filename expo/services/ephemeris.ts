/**
 * Sky positions for an arbitrary moment.
 *
 * The natal calculator answers "where were the planets when you were born". A forecast
 * needs "where are they now, and next week". Same astronomy, different instant — so this
 * imports the primitives from natal.ts rather than keeping a second copy that would
 * quietly drift out of agreement with the birth chart the user is looking at.
 *
 * Everything here works from a JavaScript Date interpreted as UTC.
 */

import {
  T,
  julianDay,
  norm360,
  lonToSign,
  sunLon,
  moonLon,
  geocentricLon,
  isRetro,
  PLANET_NAMES,
} from './natal';

export interface PlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  degree: number;
  isRetrograde: boolean;
}

/** Julian day for a Date, taking its UTC fields. */
export function julianDayFromDate(date: Date): number {
  return julianDay(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600,
  );
}

/** Ecliptic longitude of one body at a given Julian century. */
export function longitudeOf(planet: string, t: number): number {
  if (planet === 'Sun') return sunLon(t);
  if (planet === 'Moon') return moonLon(t);
  return geocentricLon(planet, t);
}

/** Every tracked body at one instant. */
export function planetPositions(date: Date): PlanetPosition[] {
  const t = T(julianDayFromDate(date));

  return PLANET_NAMES.map((name) => {
    const longitude = norm360(longitudeOf(name, t));
    const info = lonToSign(longitude);
    return {
      name,
      longitude,
      sign: info.sign,
      degree: Math.round(info.degree * 100) / 100,
      // The Sun and Moon never retrograde; isRetro() would be comparing noise.
      isRetrograde: name === 'Sun' || name === 'Moon' ? false : isRetro(name, t),
    };
  });
}

/**
 * Local midnight for a calendar day, as a UTC Date.
 *
 * A forecast is anchored to the day the user is living in. Building the key from
 * toISOString() would hand someone in Los Angeles tomorrow's reading from 5pm onward,
 * because that is already the next UTC day.
 */
export function localDayStart(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** `YYYY-MM-DD` in the device's own calendar, never shifted by UTC. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Midday local time — the representative instant for a whole-day reading. */
export function localDayNoon(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

/** Add whole days without tripping over month ends or DST. */
export function addDays(date: Date, days: number): Date {
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + days);
  return out;
}

/**
 * Sample instants across a period.
 *
 * Daily reads one moment. Weekly walks seven days so a transit that peaks on Thursday is
 * found. Monthly steps every two days: enough to catch a fast planet's peak without
 * computing 30 full skies on a phone.
 */
export function samplePeriod(period: 'daily' | 'weekly' | 'monthly', start: Date): Date[] {
  if (period === 'daily') return [localDayNoon(start)];

  const span = period === 'weekly' ? 7 : 30;
  const step = period === 'weekly' ? 1 : 2;

  const out: Date[] = [];
  for (let i = 0; i < span; i += step) {
    out.push(localDayNoon(addDays(start, i)));
  }
  return out;
}
