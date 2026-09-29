/**
 * Profile → BirthMoment for the Places engine.
 *
 * Kept apart from services/places.ts so that module stays free of the React Native
 * dependencies personal-horoscope pulls in, and can be tested on its own.
 */

import { resolveBirth, birthUtcOffsetMinutes, type HoroscopeProfileInput } from './personal-horoscope';
import type { BirthMoment } from './places';
import { parseAndValidateBirthDate } from '@/lib/validation';

/**
 * Null unless the profile has an exact birth time AND a zone to convert it to UT.
 * Planet lines move 15° of longitude per hour, so without both the map would be
 * confidently wrong rather than approximately right — better to ask for the data.
 */
export function birthMomentFromProfile(profile: HoroscopeProfileInput | null | undefined): BirthMoment | null {
  const birth = resolveBirth(profile);
  if (!birth?.hasTime || birth.hour === undefined) return null;

  const utcOffsetMinutes = birthUtcOffsetMinutes(profile, birth);
  if (utcOffsetMinutes === undefined) return null;

  return {
    year: birth.year,
    month: birth.month,
    day: birth.day,
    hour: birth.hour,
    minute: birth.minute ?? 0,
    utcOffsetMinutes,
  };
}

/**
 * A BirthMoment from raw inputs — used for a partner, who has no profile. Goes
 * through the same zone conversion as the user's own chart (DST included), so the
 * two charts on a Couple Map are computed identically.
 */
export function birthMomentFromParts(date: string, hour: number, minute: number, timezone: string): BirthMoment | null {
  // Typed by hand, so validate as a real calendar date: resolveBirth only range-checks
  // the day, which let "1997-02-30" through and silently rolled it to March 2.
  if (!parseAndValidateBirthDate(date)) return null;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  return birthMomentFromProfile({ birth_date: date, timezone, quiz_data: { birth_hour: hour, birth_minute: minute } });
}
