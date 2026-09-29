/**
 * Power Places — which cities in the world light up a person's chart.
 *
 * At the moment of birth every planet sat directly overhead (Midheaven), directly
 * underfoot (IC), on the eastern horizon (Ascendant) or on the western horizon
 * (Descendant) somewhere on Earth. Those four places trace lines around the globe —
 * this is astrocartography. Where a line passes close to a city, astrologers read that
 * planet's themes as strongest there: Venus lines for love, the Sun for recognition,
 * and so on.
 *
 * Everything here is computed on the device from the same planetary positions the
 * natal chart uses. It needs an exact birth time, because the lines move 15° of
 * longitude for every hour of error.
 *
 * Kept free of React Native imports so it can be tested on its own; the screen does
 * the profile-to-BirthMoment translation.
 */

import { julianDay, T, norm360, sunLon, moonLon, geocentricEcliptic, calcAscendant, lonToSign } from './natal';
import { CITIES, type City } from '@/data/cities';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const KM_PER_DEG = 111.32;

/**
 * General precession in longitude, degrees per Julian century.
 *
 * natal.ts computes the Sun and planets from Keplerian elements referred to the
 * J2000 equinox, while sidereal time — which places the lines on the map — is of
 * date. Mixing the two shifts every line by the precession since 2000: measured at
 * a constant ~0.35° against published solar-noon longitudes for 2024 before this
 * correction, ~0.01° after. The Moon formula is already of date and does not need it.
 */
const PRECESSION_DEG_PER_CENTURY = 1.396971;

/** Beyond this a line is too far away to call a city "yours". */
export const MAX_KM = 600;
/**
 * Longitude cap alongside the km cap. Near the poles a degree of longitude is short,
 * so a km limit alone would let a line thousands of km of longitude away count.
 */
const MAX_LON_DEG = 8;

export type PlacePlanet = 'Sun' | 'Moon' | 'Venus' | 'Mars' | 'Jupiter';
export type Angle = 'MC' | 'IC' | 'ASC' | 'DSC';
export type Theme = 'love' | 'career' | 'home' | 'luck' | 'drive';
export type Strength = 'exact' | 'strong' | 'near';

export const THEMES: { key: Theme; planet: PlacePlanet; label: string; blurb: string }[] = [
  { key: 'love', planet: 'Venus', label: 'Love', blurb: 'Where romance, attraction and beauty come easier.' },
  { key: 'career', planet: 'Sun', label: 'Career & recognition', blurb: 'Where you are seen and your work gets noticed.' },
  { key: 'home', planet: 'Moon', label: 'Home & belonging', blurb: 'Where you feel safe, settled and at ease.' },
  { key: 'luck', planet: 'Jupiter', label: 'Luck & growth', blurb: 'Where opportunity and optimism open up.' },
  { key: 'drive', planet: 'Mars', label: 'Drive & energy', blurb: 'Where you feel bold, motivated and ready to act.' },
];

export const ANGLE_LABEL: Record<Angle, string> = {
  MC: 'Midheaven line',
  IC: 'Home line',
  ASC: 'Rising line',
  DSC: 'Partner line',
};

export const STRENGTH_LABEL: Record<Strength, string> = {
  exact: 'Right on your line',
  strong: 'Very close',
  near: 'Within reach',
};

const MEANING: Record<PlacePlanet, Record<Angle, string>> = {
  Venus: {
    MC: 'Your charm is on display here. Love and admiration tend to find you in public.',
    IC: 'Home feels beautiful and warm here, a place to build a life with someone.',
    ASC: 'You come across as magnetic here. People are drawn to you quickly.',
    DSC: 'A classic partnership line. Relationships tend to start and deepen here.',
  },
  Sun: {
    MC: 'Your strongest line for visibility. Work, reputation and leadership get noticed.',
    IC: 'A place to put down roots and feel proud of your home base.',
    ASC: 'You feel confident and fully yourself here. You shine without trying.',
    DSC: 'Collaborations and key partners help you rise here.',
  },
  Moon: {
    MC: 'People respond to your care and intuition here. A gentle public role suits you.',
    IC: 'One of your deepest home lines: safety, family and emotional ease.',
    ASC: 'You feel open and emotionally tuned in here. Others sense your warmth.',
    DSC: 'Close, nurturing relationships come naturally here.',
  },
  Jupiter: {
    MC: 'Opportunity and growth in your career. Doors open more easily here.',
    IC: 'Abundance at home. A generous, expansive place to live.',
    ASC: 'You feel lucky and optimistic here. A great place for a fresh start.',
    DSC: 'Generous partners, mentors and allies tend to appear here.',
  },
  Mars: {
    MC: 'Ambition kicks in here. A place to push hard and compete.',
    IC: 'High energy at home. Good for building, renovating and starting over.',
    ASC: 'You feel bold and physically energized here.',
    DSC: 'Passionate connections. Chemistry runs high here.',
  },
};

export function meaningOf(planet: PlacePlanet, angle: Angle): string {
  return MEANING[planet][angle];
}

export interface BirthMoment {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** Minutes to subtract from the local clock time to reach UT (e.g. -420 for PDT). */
  utcOffsetMinutes: number;
}

export interface PlanetLine {
  planet: PlacePlanet;
  /** Right ascension and declination, degrees. */
  ra: number;
  dec: number;
  /** Earth longitude of the Midheaven line, -180..180. */
  mcLon: number;
}

export interface PlaceHit {
  city: City;
  planet: PlacePlanet;
  angle: Angle;
  distanceKm: number;
  strength: Strength;
}

const PLANETS: PlacePlanet[] = ['Sun', 'Moon', 'Venus', 'Mars', 'Jupiter'];
const ANGLES: Angle[] = ['MC', 'IC', 'ASC', 'DSC'];

export function norm180(d: number): number {
  const n = norm360(d);
  return n > 180 ? n - 360 : n;
}

export function julianDayUT(b: BirthMoment): number {
  const utMinutes = b.hour * 60 + b.minute - b.utcOffsetMinutes;
  // julianDay is linear in the hour, so a UT hour below 0 or past 24 rolls the day
  // correctly without separate date arithmetic.
  return julianDay(b.year, b.month, b.day, utMinutes / 60);
}

/** Greenwich mean sidereal time in degrees — the same formula calcAscendant uses. */
export function gmstDeg(jd: number): number {
  const t = T(jd);
  return norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t);
}

/** Main terms of the Moon's ecliptic latitude (Meeus ch. 47), good to ~0.1°. */
function moonLat(t: number): number {
  const D = norm360(297.8501921 + 445267.1114034 * t) * DEG;
  const Mp = norm360(134.9633964 + 477198.8675055 * t) * DEG;
  const F = norm360(93.272095 + 483202.0175233 * t) * DEG;
  return (
    5.128122 * Math.sin(F) +
    0.280602 * Math.sin(Mp + F) +
    0.277693 * Math.sin(Mp - F) +
    0.173237 * Math.sin(2 * D - F)
  );
}

function toEquatorial(lonDeg: number, latDeg: number, epsDeg: number): { ra: number; dec: number } {
  const l = lonDeg * DEG;
  const b = latDeg * DEG;
  const e = epsDeg * DEG;
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l));
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l));
  return { ra: norm360(ra * RAD), dec: dec * RAD };
}

export function planetLines(birth: BirthMoment): PlanetLine[] {
  const jd = julianDayUT(birth);
  const t = T(jd);
  const eps = 23.4393 - 0.013 * t;
  const gmst = gmstDeg(jd);

  return PLANETS.map((planet) => {
    let ecl: { lon: number; lat: number };
    if (planet === 'Moon') ecl = { lon: moonLon(t), lat: moonLat(t) };
    else {
      const j2000 = planet === 'Sun' ? { lon: sunLon(t), lat: 0 } : geocentricEcliptic(planet, t);
      ecl = { lon: norm360(j2000.lon + PRECESSION_DEG_PER_CENTURY * t), lat: j2000.lat };
    }

    const { ra, dec } = toEquatorial(ecl.lon, ecl.lat, eps);
    return { planet, ra, dec, mcLon: norm180(ra - gmst) };
  });
}

/**
 * Longitude where a planet's line crosses the given latitude, or null where it has
 * none. MC and IC are meridians, so latitude does not matter; the horizon lines curve,
 * and near the poles a planet can be circumpolar and never rise or set at all.
 */
export function lineLonAt(line: PlanetLine, angle: Angle, latDeg: number): number | null {
  if (angle === 'MC') return line.mcLon;
  if (angle === 'IC') return norm180(line.mcLon + 180);

  const x = -Math.tan(latDeg * DEG) * Math.tan(line.dec * DEG);
  if (x < -1 || x > 1) return null;
  const h0 = Math.acos(x) * RAD;
  // Hour angle is negative when rising in the east.
  return angle === 'ASC' ? norm180(line.mcLon - h0) : norm180(line.mcLon + h0);
}

function strengthOf(km: number): Strength {
  if (km <= 150) return 'exact';
  if (km <= 350) return 'strong';
  return 'near';
}

/** The closest line of `planet` to `city`, or null when none is within range. */
function closestHit(line: PlanetLine, city: City): PlaceHit | null {
  let best: PlaceHit | null = null;
  for (const angle of ANGLES) {
    const lineLon = lineLonAt(line, angle, city.lat);
    if (lineLon === null) continue;
    const dLon = Math.abs(norm180(city.lon - lineLon));
    if (dLon > MAX_LON_DEG) continue;
    const km = dLon * KM_PER_DEG * Math.cos(city.lat * DEG);
    if (km > MAX_KM) continue;
    if (!best || km < best.distanceKm) {
      best = { city, planet: line.planet, angle, distanceKm: km, strength: strengthOf(km) };
    }
  }
  return best;
}

/** Cities where the planet behind `theme` is strongest for this birth, closest first. */
export function placesForTheme(birth: BirthMoment, theme: Theme, limit = 5, cities: City[] = CITIES): PlaceHit[] {
  const planet = THEMES.find((th) => th.key === theme)!.planet;
  const line = planetLines(birth).find((l) => l.planet === planet)!;
  return cities
    .map((city) => closestHit(line, city))
    .filter((hit): hit is PlaceHit => hit !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/** Every planet line running near one city, closest first — "what does this city do for me?" */
export function readCity(birth: BirthMoment, city: City): PlaceHit[] {
  return planetLines(birth)
    .map((line) => closestHit(line, city))
    .filter((hit): hit is PlaceHit => hit !== null)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function formatMiles(km: number): string {
  const mi = km * 0.621371;
  if (mi < 10) return 'under 10 mi';
  return `${Math.round(mi / 5) * 5} mi`;
}

// ── Power city ─────────────────────────────────────────────

const STRENGTH_WEIGHT: Record<Strength, number> = { exact: 3, strong: 2, near: 1 };

export interface PowerCity {
  city: City;
  hits: PlaceHit[];
}

/**
 * The single city where the most of a person's lines cross, weighted by how close
 * each passes. Ties go to the city with the closest line. Null when nothing on the
 * map is in range, which the screen treats as "no headline city" rather than
 * promoting a weak match.
 */
export function powerCity(birth: BirthMoment, cities: City[] = CITIES): PowerCity | null {
  const lines = planetLines(birth);
  let best: { city: City; hits: PlaceHit[]; score: number; closest: number } | null = null;

  for (const city of cities) {
    const hits = lines
      .map((line) => closestHit(line, city))
      .filter((hit): hit is PlaceHit => hit !== null)
      .sort((a, b) => a.distanceKm - b.distanceKm);
    if (hits.length === 0) continue;

    const score = hits.reduce((sum, hit) => sum + STRENGTH_WEIGHT[hit.strength], 0);
    const closest = hits[0].distanceKm;
    if (!best || score > best.score || (score === best.score && closest < best.closest)) {
      best = { city, hits, score, closest };
    }
  }

  return best ? { city: best.city, hits: best.hits } : null;
}

// ── Relocated rising sign ──────────────────────────────────

/**
 * The rising sign a person would have if they had been born at the same instant in
 * a different city — the "relocated chart" astrocartography rests on. Same instant,
 * different horizon, so only the angles move; the planets' signs do not.
 *
 * Uses the same calcAscendant the Birth Chart screen does, so at the actual
 * birthplace this agrees with the rising sign shown there.
 */
export function relocatedRising(birth: BirthMoment, lat: number, lon: number): string {
  return lonToSign(calcAscendant(julianDayUT(birth), lat, lon)).sign;
}

// ── Map geometry ───────────────────────────────────────────

/** A run of [lon, lat] points to draw as one stroke. */
export type LineSegment = [number, number][];

export interface MapLines {
  mc: number;
  ic: number;
  asc: LineSegment[];
  dsc: LineSegment[];
}

/**
 * Geometry for drawing one planet's four lines on an equirectangular map.
 *
 * MC and IC are meridians, so a single longitude each. The horizon lines curve, and
 * are broken into segments wherever the planet is circumpolar (no line at that
 * latitude) or the curve wraps across the ±180° seam — drawing straight through
 * either would streak a false line across the whole map.
 */
export function mapLines(birth: BirthMoment, planet: PlacePlanet, minLat = -60, maxLat = 75, step = 1.5): MapLines {
  const line = planetLines(birth).find((l) => l.planet === planet)!;

  const trace = (angle: 'ASC' | 'DSC'): LineSegment[] => {
    const segments: LineSegment[] = [];
    let current: LineSegment = [];
    for (let lat = minLat; lat <= maxLat + 1e-9; lat += step) {
      const lon = lineLonAt(line, angle, lat);
      const prev = current[current.length - 1];
      if (lon === null || (prev && Math.abs(lon - prev[0]) > 180)) {
        if (current.length > 1) segments.push(current);
        current = [];
      }
      if (lon !== null) current.push([lon, lat]);
    }
    if (current.length > 1) segments.push(current);
    return segments;
  };

  return {
    mc: line.mcLon,
    ic: lineLonAt(line, 'IC', 0)!,
    asc: trace('ASC'),
    dsc: trace('DSC'),
  };
}
