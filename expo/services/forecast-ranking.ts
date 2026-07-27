/**
 * Ranking: which of the day's aspects are actually worth telling someone about.
 *
 * A chart under a full sky produces 30–60 aspects at any moment. Listing them all reads
 * like a data dump and buries anything meaningful, so they are scored and the strongest
 * few survive.
 *
 * The score is an internal ordering device. It is not a probability and nothing in the
 * interface presents it as one.
 */

import {
  TransitAspect,
  AspectType,
  ForecastCategory,
  ASPECT_DEFINITIONS,
  TRANSIT_PLANET_WEIGHT,
  NATAL_PLANET_WEIGHT,
} from './transit-aspects';

/** Aspects differ in how loudly they speak, independent of who is involved. */
const ASPECT_WEIGHT: Record<AspectType, number> = {
  conjunction: 1.0,
  opposition: 0.9,
  square: 0.85,
  trine: 0.75,
  sextile: 0.5,
};

/** A tightening aspect is the story going somewhere; a separating one is it fading. */
const APPLYING_BONUS = 1.15;
const SEPARATING_PENALTY = 0.85;

/**
 * Score one aspect.
 *
 * Closeness dominates on purpose: a Saturn square three degrees off exact should outrank
 * a Pluto trine sitting at the very edge of orb, because the near-exact one is what a
 * person can actually feel.
 */
export function scoreAspect(aspect: TransitAspect): number {
  const transitWeight = TRANSIT_PLANET_WEIGHT[aspect.transitPlanet] ?? 0.4;
  const natalWeight = NATAL_PLANET_WEIGHT[aspect.natalPlanet] ?? 0.4;
  const aspectWeight = ASPECT_WEIGHT[aspect.aspect];

  // 1 at exact, falling to 0 at the orb limit, curved so near-exact stands out.
  const closeness = Math.pow(1 - Math.min(aspect.orb / aspect.maxOrb, 1), 1.5);

  const motion = aspect.applying ? APPLYING_BONUS : SEPARATING_PENALTY;

  return transitWeight * natalWeight * aspectWeight * closeness * motion;
}

/** Score in place and sort strongest first. */
export function rankAspects(aspects: TransitAspect[]): TransitAspect[] {
  return aspects
    .map((a) => ({ ...a, score: Math.round(scoreAspect(a) * 10000) / 10000 }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

/**
 * Collapse repeats of the same aspect across sampled days, keeping the strongest
 * occurrence and recording when it peaks.
 *
 * Without this a weekly forecast says "Saturn squares your Moon" seven times, because a
 * slow transit is present on every sampled day.
 */
export function dedupeByKey(
  samples: { date: Date; aspects: TransitAspect[] }[],
): TransitAspect[] {
  const best = new Map<string, TransitAspect>();

  for (const { date, aspects } of samples) {
    for (const aspect of aspects) {
      const existing = best.get(aspect.key);
      if (!existing || aspect.score > existing.score) {
        best.set(aspect.key, { ...aspect, peakDate: date.toISOString().slice(0, 10) });
      }
    }
  }

  return Array.from(best.values()).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
}

/**
 * Strongest aspects for one section.
 *
 * A minimum score keeps a section from padding itself with noise: a category with nothing
 * genuinely active should say so rather than dress up a 0.02-scoring Moon sextile as news.
 */
export function topForCategory(
  aspects: TransitAspect[],
  category: ForecastCategory,
  limit: number,
  minScore = 0.02,
): TransitAspect[] {
  return aspects
    .filter((a) => a.categories.includes(category) && a.score >= minScore)
    .slice(0, limit);
}

/** Supportive / challenging / mixed, from what is actually strongest. */
export function overallTone(aspects: TransitAspect[]): 'supportive' | 'challenging' | 'mixed' | 'quiet' {
  const top = aspects.slice(0, 5);
  if (top.length === 0) return 'quiet';

  let supportive = 0;
  let challenging = 0;
  for (const a of top) {
    const tone = ASPECT_DEFINITIONS[a.aspect].tone;
    if (tone === 'supportive') supportive += a.score;
    if (tone === 'challenging') challenging += a.score;
  }

  if (supportive === 0 && challenging === 0) return 'quiet';
  const ratio = supportive / (supportive + challenging);
  if (ratio > 0.65) return 'supportive';
  if (ratio < 0.35) return 'challenging';
  return 'mixed';
}
