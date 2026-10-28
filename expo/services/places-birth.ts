/**
 * Profile → BirthMoment for the Places engine.
 *
 * Kept apart from services/places.ts so that module stays free of the React Native
 * dependencies personal-horoscope pulls in, and can be tested on its own.
 */

import { resolveBirth, birthUtcOffsetMinutes, type HoroscopeProfileInput } from './personal-horoscope';
import { julianDayUT, longitudeOfDate, type BirthMoment } from './places';
import { T, lonToSign } from './natal';
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

/**
 * Every profile field that can change a BirthMoment, as one string — for memo and
 * query dependencies, so a notification toggle or avatar change does not recompute a
 * chart while a birth-time or birthplace edit always does.
 */
export function birthInputsKey(profile: HoroscopeProfileInput | null | undefined): string {
  return JSON.stringify([
    profile?.birth_date ?? null,
    profile?.timezone ?? null,
    profile?.birth_lat ?? null,
    profile?.birth_lon ?? null,
    profile?.birth_city ?? null,
    profile?.quiz_data?.birth_hour ?? null,
    profile?.quiz_data?.birth_minute ?? null,
  ]);
}

/**
 * Sun sign from the birth details, so nobody has to pick (or mis-pick) one. Uses the
 * exact moment when time and zone are known; without a time, noon in the birth zone
 * (noon UTC if no zone is known either), which is right for every birthday except the
 * few hours around the Sun changing sign. Null without a valid birth date.
 */
export function sunSignFromBirth(profile: HoroscopeProfileInput | null | undefined): string | null {
  const birth = resolveBirth(profile);
  if (!birth || !parseAndValidateBirthDate(String(profile?.birth_date).slice(0, 10))) return null;
  // The zone's offset applies with or without a time: noon there, not noon at Greenwich.
  const offset = birthUtcOffsetMinutes(profile, birth) ?? 0;
  const hour = birth.hasTime ? (birth.hour ?? 12) : 12;
  const minute = birth.hasTime ? (birth.minute ?? 0) : 0;
  const jd = julianDayUT({ year: birth.year, month: birth.month, day: birth.day, hour, minute, utcOffsetMinutes: offset });
  return lonToSign(longitudeOfDate('Sun', T(jd))).sign;
}
