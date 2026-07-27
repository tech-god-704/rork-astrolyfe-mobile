/**
 * Personal horoscope: the public entry point for the forecast feature.
 *
 * Resolution order, strongest first:
 *
 *   1. full        — birth date, time and place. Uses natal planets and the ascendant.
 *   2. birth-date  — birth date only. Uses natal planets; makes no house or angle claims.
 *   3. curated     — a date-valid row for the sign from the database, if one exists.
 *   4. sign-only   — the legacy local template. Kept as the rollback path.
 *
 * The personal tiers never touch the network. Curated content cannot displace a personal
 * forecast: a generic per-sign paragraph is strictly less informative than a reading built
 * from the user's own chart, and letting it win would have made the feature worse whenever
 * someone remembered to fill the table.
 */

import { calculateNatalChart } from './natal';
import { planetPositions, localDayNoon, localDateKey, samplePeriod } from './ephemeris';
import { findTransitAspects, type TransitAspect, type NatalPoint } from './transit-aspects';
import { rankAspects, dedupeByKey } from './forecast-ranking';
import {
  buildAllCategories,
  buildSummary,
  buildCaution,
  seedFrom,
  type CategorizedReading,
  type HoroscopePeriod,
} from './forecast-builder';
import { ENGINE_VERSION } from '@/data/horoscope/interpretations';
import { chartFingerprint, cacheKey, readCache, writeCache } from './horoscope-cache';
import { getHoroscope, fetchCuratedHoroscope, type HoroscopeReading } from './horoscope';

export type PersonalizationLevel = 'full' | 'birth-date' | 'sign-only';

export interface PersonalHoroscopeReading {
  period: HoroscopePeriod;
  date: string;
  title: string;
  summary: string;
  categories: CategorizedReading[];
  events: TransitAspect[];
  personalizationLevel: PersonalizationLevel;
  confidenceLabel: string;
  upgradeHint?: string;
  caution: string;
  source: 'local-personal' | 'curated-sign' | 'local-sign';
  engineVersion: string;
}

/** The subset of the profile this feature reads. */
export interface HoroscopeProfileInput {
  birth_date?: string | null;
  zodiac_sign?: string | null;
  birth_lat?: number | null;
  birth_lon?: number | null;
  timezone?: string | null;
  quiz_data?: { birth_hour?: number | null; birth_minute?: number | null } | null;
}

interface ResolvedBirth {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  latitude?: number;
  longitude?: number;
  hasTime: boolean;
  hasPlace: boolean;
}

/** See natal.ts — stored coordinates default to 0, which is not a real birthplace. */
function usableCoordinate(lat?: number | null, lon?: number | null): boolean {
  if (lat == null || lon == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return false;
  return !(lat === 0 && lon === 0);
}

export function resolveBirth(profile: HoroscopeProfileInput | null | undefined): ResolvedBirth | null {
  const raw = profile?.birth_date;
  if (!raw) return null;

  const parts = String(raw).slice(0, 10).split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const hour = profile?.quiz_data?.birth_hour;
  const minute = profile?.quiz_data?.birth_minute;
  const hasTime = hour != null && Number.isFinite(hour);
  const hasPlace = usableCoordinate(profile?.birth_lat, profile?.birth_lon);

  return {
    year,
    month,
    day,
    hour: hasTime ? (hour as number) : undefined,
    minute: hasTime && minute != null ? minute : undefined,
    latitude: hasPlace ? (profile?.birth_lat as number) : undefined,
    longitude: hasPlace ? (profile?.birth_lon as number) : undefined,
    hasTime,
    hasPlace,
  };
}

/**
 * Minutes to subtract from the birth clock time to reach UT.
 *
 * Birth time is a wall-clock reading in the birthplace's zone. Without converting it the
 * ascendant is wrong by the offset — up to a 47° error for a US birth. The zone recorded
 * on the profile is the best available source; where it is missing the birth time is used
 * as-is, and the resulting chart is reported at the lower confidence tier rather than
 * presented as exact.
 */
export function birthUtcOffsetMinutes(profile: HoroscopeProfileInput | null | undefined, birth: ResolvedBirth): number | undefined {
  const zone = profile?.timezone;
  if (!zone) return undefined;

  try {
    // Deliberately not `timeZoneName: 'longOffset'`. That option needs a full-ICU build
    // and throws outright on leaner ones — including the JS engine on some devices —
    // which would silently drop every user to the lower confidence tier. Formatting the
    // instant in the target zone and reading it back as if it were UTC needs only basic
    // timeZone support, which is far more widely available.
    const offsetAt = (instant: Date): number | undefined => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        hour12: false,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      }).formatToParts(instant);

      const field: Record<string, string> = {};
      for (const p of parts) if (p.type !== 'literal') field[p.type] = p.value;
      if (!field.year || !field.hour) return undefined;

      // Some engines render midnight as hour 24.
      const hour = parseInt(field.hour, 10) % 24;

      const asIfUtc = Date.UTC(
        parseInt(field.year, 10),
        parseInt(field.month, 10) - 1,
        parseInt(field.day, 10),
        hour,
        parseInt(field.minute, 10),
        parseInt(field.second, 10),
      );
      return Math.round((asIfUtc - instant.getTime()) / 60000);
    };

    // The birth time is a wall clock reading, so the true instant is not known until the
    // offset is — and the offset depends on the instant. Start by treating the clock time
    // as UTC, then re-measure at the corrected instant. One pass settles it except within
    // the ambiguous hour of a DST change, where either answer is defensible.
    const naive = new Date(Date.UTC(birth.year, birth.month - 1, birth.day, birth.hour ?? 12, birth.minute ?? 0));
    const firstPass = offsetAt(naive);
    if (firstPass === undefined) return undefined;

    return offsetAt(new Date(naive.getTime() - firstPass * 60000)) ?? firstPass;
  } catch {
    // No usable Intl timezone data — degrade to the lower tier rather than guess.
    return undefined;
  }
}

/**
 * Cache key for a period.
 *
 * Every period keys on the day its window opens, because `samplePeriod` always walks
 * forward from *today*. An earlier version anchored weekly to the containing Monday and
 * monthly to the calendar month, which quietly broke both: the window moved every day
 * while the key did not, so Monday's reading was pinned for the rest of the week and the
 * 1st of the month's reading was pinned until the 30th. Key and window must describe the
 * same span or the cache serves a forecast for days that have already passed.
 */
function periodStartKey(period: HoroscopePeriod, date: Date): string {
  return localDateKey(date);
}

const TITLES: Record<HoroscopePeriod, string> = {
  daily: 'Your Day Ahead',
  weekly: 'Your Week Ahead',
  monthly: 'Your Month Ahead',
};

/**
 * Compute a personal forecast. Pure and synchronous — no network, no storage.
 * Exported so tests can exercise the engine without mocking AsyncStorage.
 */
export function computePersonalHoroscope(
  profile: HoroscopeProfileInput,
  period: HoroscopePeriod,
  now: Date = new Date(),
): PersonalHoroscopeReading | null {
  const birth = resolveBirth(profile);
  if (!birth) return null;

  const utcOffsetMinutes = birthUtcOffsetMinutes(profile, birth);

  const natalChart = calculateNatalChart({
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: birth.hour,
    minute: birth.minute,
    latitude: birth.latitude,
    longitude: birth.longitude,
    utcOffsetMinutes,
  });

  const natalPoints: NatalPoint[] = natalChart.planets.map((p) => ({
    name: p.name,
    longitude: p.fullDegree,
  }));

  // The ascendant is a genuine sensitive point, but only when the birth time, the place
  // and the zone are all known. Anything less and it is an artefact of a default.
  const ascendantTrustworthy =
    birth.hasTime && birth.hasPlace && utcOffsetMinutes != null && natalChart.ascendant != null;

  if (ascendantTrustworthy) {
    natalPoints.push({ name: 'Ascendant', longitude: natalChart.ascendant as number });
  }

  const start = localDayNoon(now);
  const samples = samplePeriod(period, start).map((date) => ({
    date,
    aspects: rankAspects(findTransitAspects(planetPositions(date), natalPoints, date)),
  }));

  const events = period === 'daily'
    ? samples[0].aspects
    : dedupeByKey(samples);

  const level: PersonalizationLevel = ascendantTrustworthy ? 'full' : 'birth-date';

  const seed = seedFrom(
    chartFingerprint({
      birthDate: profile.birth_date ?? null,
      hour: birth.hour ?? null,
      minute: birth.minute ?? null,
      latitude: birth.latitude ?? null,
      longitude: birth.longitude ?? null,
      sign: profile.zodiac_sign ?? null,
    }),
    period,
    periodStartKey(period, start),
    ENGINE_VERSION,
    events.slice(0, 6).map((e) => e.key).join(','),
  );

  return {
    period,
    date: localDateKey(start),
    title: TITLES[period],
    summary: buildSummary(events, seed, period),
    categories: buildAllCategories(events, seed, start, period),
    events: events.slice(0, 8),
    personalizationLevel: level,
    confidenceLabel: level === 'full' ? 'Based on your full birth chart' : 'Based on your birth date',
    upgradeHint: level === 'full'
      ? undefined
      : 'Add your birth time and place for more precise houses and angles.',
    caution: buildCaution(seed),
    source: 'local-personal',
    engineVersion: ENGINE_VERSION,
  };
}

/** Wrap the legacy sign-only reading in the current result shape. */
function fromSignReading(reading: HoroscopeReading, period: HoroscopePeriod, source: 'curated-sign' | 'local-sign'): PersonalHoroscopeReading {
  const sign = reading.sign || 'your sign';
  return {
    period,
    date: reading.date,
    title: TITLES[period],
    summary: `General ${period} forecast for ${sign}.`,
    categories: [{ category: 'overview', title: 'Overview', content: reading.horoscope }],
    events: [],
    personalizationLevel: 'sign-only',
    confidenceLabel: `General forecast for ${sign}`,
    upgradeHint: 'Add your birth date, time and place for a forecast based on your own chart.',
    caution: 'Take what is useful and leave the rest.',
    source,
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * The function the screen calls.
 *
 * Personal forecasts are cached and never require the network. Only the sign-only path
 * consults the database, so the screen works fully offline for anyone with a birth date.
 */
export async function getPersonalHoroscope(args: {
  profile: HoroscopeProfileInput | null | undefined;
  period: HoroscopePeriod;
  date?: Date;
  forceRefresh?: boolean;
}): Promise<PersonalHoroscopeReading> {
  const { profile, period, date = new Date(), forceRefresh = false } = args;
  const start = localDayNoon(date);

  const birth = resolveBirth(profile);

  if (birth && profile) {
    const fingerprint = chartFingerprint({
      birthDate: profile.birth_date ?? null,
      hour: birth.hour ?? null,
      minute: birth.minute ?? null,
      latitude: birth.latitude ?? null,
      longitude: birth.longitude ?? null,
      sign: profile.zodiac_sign ?? null,
    });
    const key = cacheKey(fingerprint, period, periodStartKey(period, start));

    if (!forceRefresh) {
      const cached = await readCache<PersonalHoroscopeReading>(key);
      if (cached && cached.engineVersion === ENGINE_VERSION) return cached;
    }

    const computed = computePersonalHoroscope(profile, period, date);
    if (computed) {
      await writeCache(key, computed);
      return computed;
    }
  }

  // No usable birth date — fall back to the sign, preferring date-valid curated content.
  const sign = profile?.zodiac_sign || 'Aries';
  try {
    const curated = await fetchCuratedHoroscope(sign, period, start);
    if (curated) return fromSignReading(curated, period, 'curated-sign');
  } catch {
    // Offline or unreachable: the local generator below still produces something.
  }

  return fromSignReading(getHoroscope(sign, period), period, 'local-sign');
}
