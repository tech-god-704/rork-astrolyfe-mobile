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

import { CITIES, nearestCity, type City } from '@/data/cities';
import { distanceKm, bearingDeg, EARTH_KM } from '@/lib/geo';
import { norm360 } from './natal';
import { planetLines, julianDayUT, gmstDeg, norm180, type BirthMoment, type PlacePlanet } from './places';

export { distanceKm, bearingDeg, nearestCity };

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** A cross-track distance under this counts as "on" the direction line… */
export const ON_LINE_KM = 350;
/**
 * …as long as the city also lies roughly that way from home. Near home, 350 km of
 * slack would admit cities in almost any direction (a "west" line listing a city to
 * the southeast); this keeps the listed cities honest to the compass point shown.
 */
export const MAX_DEVIATION_DEG = 15;

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

/** Current wall-clock time in a city, e.g. "3:42 PM", or null where Intl lacks the zone. */
export function localTimeIn(tz: string, now: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(now);
  } catch {
    return null;
  }
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

/**
 * Ring (radius) for each compass marker so markers don't sit on top of each other.
 * Each goes on the outermost ring where it clears every marker already placed by
 * `gap` (centre to centre, in drawing units); with none clear, the ring with the most
 * room. Bearings are never changed and a radius is always one of `rings`.
 */
export function assignRings(azimuths: number[], rings: number[], gap: number): number[] {
  const at = (az: number, r: number) => ({ x: r * Math.sin(az * DEG), y: -r * Math.cos(az * DEG) });
  const result: number[] = new Array(azimuths.length);
  const placed: { x: number; y: number }[] = [];
  const order = azimuths.map((az, i) => ({ az, i })).sort((a, b) => a.az - b.az);
  for (const { az, i } of order) {
    const room = (r: number) => {
      const p = at(az, r);
      return placed.reduce((m, q) => Math.min(m, Math.hypot(p.x - q.x, p.y - q.y)), Infinity);
    };
    const r = rings.find((ring) => room(ring) >= gap) ?? rings.reduce((best, ring) => (room(ring) > room(best) ? ring : best));
    result[i] = r;
    placed.push(at(az, r));
  }
  return result;
}

const EIGHT = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];

/** Nearest of the eight main directions, for headlines: "west", "northeast"… */
export function mainDirection(azimuth: number): string {
  return EIGHT[Math.round(norm360(azimuth) / 45) % 8];
}
