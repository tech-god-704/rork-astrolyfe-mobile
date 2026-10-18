/**
 * The compass from home — local space.
 *
 * Astrocartography (places.ts) asks where on Earth each planet was overhead at birth.
 * Local space asks a different question: standing at one spot, in which compass
 * direction did each planet lie at that moment? Each direction is a great circle out
 * from that spot, and the cities along it are "on" that planet's line from there.
 *
 * Measured from where the person lives now rather than where they were born (the
 * relocated form), it answers a practical question: which way to move or travel from
 * home for love, career and the rest — and how far.
 *
 * Pure geometry on top of places.ts's planet positions, so it can be tested outside
 * the app against known sun positions and great-circle bearings.
 */

import { CITIES, type City } from '@/data/cities';
import { planetLines, julianDayUT, gmstDeg, norm180, type BirthMoment, type PlacePlanet } from './places';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
const EARTH_KM = 6371;

/** A cross-track distance under this counts as "on" the direction line… */
export const ON_LINE_KM = 350;
/**
 * …as long as the city also lies roughly that way from home. Near home, 350 km of
 * slack would admit cities in almost any direction (a "west" line listing a city to
 * the southeast); this keeps the listed cities honest to the compass point shown.
 */
export const MAX_DEVIATION_DEG = 15;

const norm360 = (d: number) => ((d % 360) + 360) % 360;

export interface Home {
  name: string;
  lat: number;
  lon: number;
}

/** Where a planet sat as seen from `home` at the birth moment. */
export interface PlanetDirection {
  planet: PlacePlanet;
  /** Degrees clockwise from true north, 0–360. */
  azimuth: number;
  /** Degrees above (+) or below (−) the horizon. */
  altitude: number;
}

export function planetDirections(birth: BirthMoment, home: Pick<Home, 'lat' | 'lon'>): PlanetDirection[] {
  const lst = gmstDeg(julianDayUT(birth)) + home.lon;
  const phi = home.lat * DEG;
  return planetLines(birth).map(({ planet, ra, dec }) => {
    const h = (lst - ra) * DEG;
    const d = dec * DEG;
    const altitude = Math.asin(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(h)) * RAD;
    const azimuth = norm360(
      Math.atan2(-Math.sin(h) * Math.cos(d), Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.sin(phi) * Math.cos(h)) * RAD,
    );
    return { planet, azimuth, altitude };
  });
}

/** Great-circle distance in km. */
export function distanceKm(a: Pick<Home, 'lat' | 'lon'>, b: Pick<Home, 'lat' | 'lon'>): number {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dp = p2 - p1;
  const dl = (b.lon - a.lon) * DEG;
  const s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial great-circle bearing from a to b, degrees clockwise from north. */
export function bearingDeg(a: Pick<Home, 'lat' | 'lon'>, b: Pick<Home, 'lat' | 'lon'>): number {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dl = (b.lon - a.lon) * DEG;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return norm360(Math.atan2(y, x) * RAD);
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const WORDS: Record<string, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };

/** "NE", "WSW"… */
export function compassPoint(azimuth: number): string {
  return POINTS[Math.round(norm360(azimuth) / 22.5) % 16];
}

/** "northeast", "west-southwest"… */
export function compassWords(azimuth: number): string {
  const p = compassPoint(azimuth);
  const word = (s: string) => s.split('').map((c) => WORDS[c]).join('');
  if (p.length === 3) return `${word(p[0])}-${word(p.slice(1))}`;
  return word(p);
}

export interface CityOnLine {
  city: City;
  distanceKm: number;
  /** How far the city sits off the exact line. */
  offLineKm: number;
}

/**
 * Cities along the great circle leaving `home` at `azimuth`, nearest first. Only the
 * forward half (the direction the planet lay in), and not home itself.
 */
export function citiesToward(home: Pick<Home, 'lat' | 'lon'>, azimuth: number, cities: City[] = CITIES, limit = 4): CityOnLine[] {
  const out: CityOnLine[] = [];
  for (const city of cities) {
    const d = distanceKm(home, city);
    if (d < 150) continue;
    const delta = norm180(bearingDeg(home, city) - azimuth);
    if (Math.abs(delta) > MAX_DEVIATION_DEG) continue;
    // Cross-track distance from the great circle.
    const offLineKm = Math.abs(Math.asin(Math.sin(d / EARTH_KM) * Math.sin(delta * DEG)) * EARTH_KM);
    if (offLineKm <= ON_LINE_KM) out.push({ city, distanceKm: d, offLineKm });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

/** The listed city closest to a point — used to default "home" to the birthplace. */
export function nearestCity(lat: number, lon: number, cities: City[] = CITIES): { city: City; distanceKm: number } | null {
  let best: { city: City; distanceKm: number } | null = null;
  for (const city of cities) {
    const d = distanceKm({ lat, lon }, city);
    if (!best || d < best.distanceKm) best = { city, distanceKm: d };
  }
  return best;
}

/** Current wall-clock time in a city, e.g. "3:42 PM", or null where Intl lacks the zone. */
export function localTimeIn(tz: string, now: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(now);
  } catch {
    return null;
  }
}

/** "95 mi", "2,450 mi" — rounded to 5 miles, or 10 past a thousand. */
export function formatDistance(km: number): string {
  const mi = km * 0.621371;
  const rounded = mi >= 1000 ? Math.round(mi / 10) * 10 : Math.round(mi / 5) * 5;
  return `${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} mi`;
}

export interface CityOnFullLine extends CityOnLine {
  /** True on the half pointing toward the planet; false on the opposite half. */
  toward: boolean;
  /** Bearing from home to the city. */
  bearing: number;
}

/**
 * A local-space line is a whole great circle through home: it leaves toward the planet
 * and, on the other side, away from it. Cities on both halves, nearest first.
 */
export function citiesOnLine(home: Pick<Home, 'lat' | 'lon'>, azimuth: number, cities: City[] = CITIES, limit = 5): CityOnFullLine[] {
  const tag = (toward: boolean) => (c: CityOnLine): CityOnFullLine => ({ ...c, toward, bearing: bearingDeg(home, c.city) });
  return [
    ...citiesToward(home, azimuth, cities, limit).map(tag(true)),
    ...citiesToward(home, azimuth + 180, cities, limit).map(tag(false)),
  ]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
