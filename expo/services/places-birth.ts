/**
 * Profile → BirthMoment for the Places engine.
 *
 * Kept apart from services/places.ts so that module stays free of the React Native
 * dependencies personal-horoscope pulls in, and can be tested on its own.
 */

import { resolveBirth, birthUtcOffsetMinutes, type HoroscopeProfileInput } from './personal-horoscope';
import type { BirthMoment } from './places';

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
