/**
 * Transit-to-natal aspects: where today's sky touches the chart you were born under.
 *
 * This is the whole basis of a personal forecast. Two people born under the same Sun sign
 * on different days have different Moons, different Venus placements and different angles
 * between them, so the same sky produces genuinely different results.
 *
 * Orbs and weights live here as named constants rather than scattered literals, because
 * they are the tuning surface for the entire feature.
 */

import { T, norm360, lonToSign } from './natal';
import { julianDayFromDate, longitudeOf, PlanetPosition } from './ephemeris';

export type AspectType = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
export type ForecastCategory = 'overview' | 'love' | 'career' | 'wellness';

/** Exact separation each aspect wants, and how far off it may be and still count. */
export const ASPECT_DEFINITIONS: Record<AspectType, { angle: number; baseOrb: number; tone: 'supportive' | 'challenging' | 'neutral' }> = {
  conjunction: { angle: 0,   baseOrb: 8, tone: 'neutral' },
  sextile:     { angle: 60,  baseOrb: 4, tone: 'supportive' },
  square:      { angle: 90,  baseOrb: 6, tone: 'challenging' },
  trine:       { angle: 120, baseOrb: 6, tone: 'supportive' },
  opposition:  { angle: 180, baseOrb: 6, tone: 'challenging' },
};

/**
 * Orb multiplier by transiting body.
 *
 * The Moon crosses a degree every two hours, so a wide lunar orb produces a "major
 * influence" that is over before lunch. Outer planets sit on the same degree for weeks
 * and deserve the room.
 */
const TRANSIT_ORB_FACTOR: Record<string, number> = {
  Moon: 0.5, Sun: 1, Mercury: 0.75, Venus: 0.75, Mars: 0.9,
  Jupiter: 1, Saturn: 1, Uranus: 1, Neptune: 1, Pluto: 1,
};

/** How much a transiting body matters. Slow movers mark real chapters. */
export const TRANSIT_PLANET_WEIGHT: Record<string, number> = {
  Pluto: 1.0, Neptune: 0.95, Uranus: 0.95, Saturn: 0.9, Jupiter: 0.85,
  Mars: 0.6, Sun: 0.55, Venus: 0.5, Mercury: 0.45, Moon: 0.25,
};

/** How much a natal point matters when something lands on it. */
export const NATAL_PLANET_WEIGHT: Record<string, number> = {
  Sun: 1.0, Moon: 1.0, Venus: 0.85, Mars: 0.8, Mercury: 0.75,
  Saturn: 0.7, Jupiter: 0.7, Uranus: 0.5, Neptune: 0.5, Pluto: 0.5,
  // Only ever present when birth time, place and zone are all known, so when it is
  // here it is trustworthy and rates alongside the luminaries. Without an entry it
  // fell to the 0.4 default and was ranked below planets it should outweigh.
  Ascendant: 0.95,
};

/** Which sections a planet pair can legitimately speak to. */
const PLANET_CATEGORIES: Record<string, ForecastCategory[]> = {
  Sun:     ['overview', 'career', 'wellness'],
  Moon:    ['overview', 'love', 'wellness'],
  Mercury: ['overview', 'career'],
  Venus:   ['overview', 'love'],
  Mars:    ['overview', 'career', 'wellness'],
  Jupiter: ['overview', 'career'],
  Saturn:  ['overview', 'career', 'wellness'],
  Uranus:  ['overview', 'career'],
  Neptune: ['overview', 'wellness'],
  Pluto:   ['overview', 'wellness'],
  Ascendant: ['overview', 'wellness', 'love'],
};

export interface NatalPoint {
  name: string;
  longitude: number;
}

export interface TransitAspect {
  transitPlanet: string;
  natalPlanet: string;
  aspect: AspectType;
  exactAngle: number;
  orb: number;
  maxOrb: number;
  applying: boolean;
  transitSign: string;
  natalSign: string;
  transitRetrograde: boolean;
  peakDate?: string;
  score: number;
  categories: ForecastCategory[];
  /** Stable identity for deduplication and seeding. Carries no personal data. */
  key: string;
}

/** Shortest angular distance between two longitudes, 0..180. */
export function angularSeparation(a: number, b: number): number {
  const diff = Math.abs(norm360(a) - norm360(b)) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function maxOrbFor(transitPlanet: string, aspect: AspectType): number {
  return ASPECT_DEFINITIONS[aspect].baseOrb * (TRANSIT_ORB_FACTOR[transitPlanet] ?? 1);
}

function categoriesFor(transitPlanet: string, natalPlanet: string): ForecastCategory[] {
  const set = new Set<ForecastCategory>(['overview']);
  for (const c of PLANET_CATEGORIES[transitPlanet] ?? []) set.add(c);
  for (const c of PLANET_CATEGORIES[natalPlanet] ?? []) set.add(c);
  return Array.from(set);
}

/**
 * Every aspect the sky at `date` makes to this chart.
 *
 * "Applying" is measured by re-computing the transiting body six hours later and asking
 * whether the orb tightened — cheaper and more honest than trying to infer it from
 * apparent speed, and it stays correct through retrograde stations.
 */
export function findTransitAspects(
  transits: PlanetPosition[],
  natal: NatalPoint[],
  date: Date,
): TransitAspect[] {
  const tLater = T(julianDayFromDate(new Date(date.getTime() + 6 * 3600 * 1000)));
  const out: TransitAspect[] = [];

  for (const transit of transits) {
    const laterLon = norm360(longitudeOf(transit.name, tLater));

    for (const point of natal) {
      const separation = angularSeparation(transit.longitude, point.longitude);
      const laterSeparation = angularSeparation(laterLon, point.longitude);

      for (const aspect of Object.keys(ASPECT_DEFINITIONS) as AspectType[]) {
        const { angle } = ASPECT_DEFINITIONS[aspect];
        const orb = Math.abs(separation - angle);
        const maxOrb = maxOrbFor(transit.name, aspect);
        if (orb > maxOrb) continue;

        const laterOrb = Math.abs(laterSeparation - angle);

        out.push({
          transitPlanet: transit.name,
          natalPlanet: point.name,
          aspect,
          exactAngle: Math.round(separation * 100) / 100,
          orb: Math.round(orb * 100) / 100,
          maxOrb: Math.round(maxOrb * 100) / 100,
          applying: laterOrb < orb,
          transitSign: transit.sign,
          natalSign: lonToSign(point.longitude).sign,
          transitRetrograde: transit.isRetrograde,
          score: 0, // assigned by forecast-ranking
          categories: categoriesFor(transit.name, point.name),
          key: `${transit.name}-${aspect}-${point.name}`,
        });
      }
    }
  }

  return out;
}
