/**
 * Turns ranked transits into the text a person reads.
 *
 * Each section is built from the aspects relevant to that section. The previous system
 * wrote one paragraph and sliced it into four by sentence count, so "Love" was simply
 * sentences four to six of the same generic text — this selects different events for
 * different sections, and a section with nothing happening says so.
 *
 * Selection is seeded, never random: the same chart on the same day must produce the same
 * words every time it is opened, or the feature reads as arbitrary.
 */

import type { TransitAspect, ForecastCategory } from './transit-aspects';
import { ASPECT_DEFINITIONS } from './transit-aspects';
import { topForCategory, overallTone } from './forecast-ranking';
import {
  ASPECT_INTERPRETATIONS,
  TRANSIT_THEMES,
  NATAL_THEMES,
  ACTIONS,
  CAUTIONS,
  CATEGORY_OPENERS,
  QUIET_CATEGORY,
  PERIOD_FRAMING,
  relativeTiming,
} from '@/data/horoscope/interpretations';

export type HoroscopePeriod = 'daily' | 'weekly' | 'monthly';

export interface CategorizedReading {
  category: string;
  title: string;
  content: string;
}

const CATEGORY_TITLES: Record<ForecastCategory, string> = {
  overview: 'Overview',
  love: 'Love & Relationships',
  career: 'Career & Growth',
  wellness: 'Wellness & Energy',
};

/**
 * FNV-1a. A small, stable string hash.
 *
 * Math.random() would give a different reading each time the screen mounted; a hash of
 * the chart, date and event set gives variety that is reproducible.
 */
export function seedFrom(...parts: (string | number)[]): number {
  let hash = 0x811c9dc5;
  const input = parts.join('|');
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Deterministic pick. Offset lets one seed drive several independent choices. */
function pick<T>(items: readonly T[], seed: number, offset = 0): T {
  if (items.length === 0) throw new Error('pick() called with an empty list');
  const mixed = Math.imul(seed ^ Math.imul(offset + 1, 0x9e3779b9), 0x85ebca6b) >>> 0;
  return items[mixed % items.length];
}

/**
 * Sentences after the opening colon start with a planet name. Lowercasing them to read
 * as one continuous clause turned "Saturn" into "saturn", so the sentence is left as-is.
 */

/**
 * One aspect described in a sentence or two.
 *
 * Reads as "Saturn presses on your Moon" plus what each side means, so the wording is
 * traceable to a real calculated position rather than to a bucket of stock phrases.
 */
export function describeAspect(
  aspect: TransitAspect,
  seed: number,
  start: Date,
  period: HoroscopePeriod,
  index: number,
): string {
  const voice = ASPECT_INTERPRETATIONS[aspect.aspect];
  const connector = pick(voice.connectors, seed, index * 7 + 1);
  const meaning = pick(voice.meanings, seed, index * 7 + 2);
  const transitTheme = pick(TRANSIT_THEMES[aspect.transitPlanet] ?? ['a shift'], seed, index * 7 + 3);
  const natalTheme = pick(NATAL_THEMES[aspect.natalPlanet] ?? ['your chart'], seed, index * 7 + 4);

  const retro = aspect.transitRetrograde ? ', retrograde,' : '';
  const timing = relativeTiming(aspect.peakDate, start, period);
  const motion = aspect.applying ? 'building' : 'easing';

  return (
    `${aspect.transitPlanet}${retro} ${connector} your ${aspect.natalPlanet}` +
    `${timing}, bringing ${transitTheme} to ${natalTheme}. ` +
    `${meaning} This influence is ${motion}.`
  );
}

/** Build one section from its own events. */
export function buildCategory(
  category: ForecastCategory,
  aspects: TransitAspect[],
  seed: number,
  start: Date,
  period: HoroscopePeriod,
): CategorizedReading {
  const limit = category === 'overview' ? 3 : 2;
  const selected = topForCategory(aspects, category, limit);

  if (selected.length === 0) {
    return {
      category,
      title: CATEGORY_TITLES[category],
      content: QUIET_CATEGORY[category],
    };
  }

  const opener = pick(CATEGORY_OPENERS[category], seed, category.length);
  const framing = pick(PERIOD_FRAMING[period], seed, category.length + 11);

  const sentences = selected.map((aspect, i) =>
    describeAspect(aspect, seed, start, period, i),
  );

  const tone = ASPECT_DEFINITIONS[selected[0].aspect].tone;
  const action = pick(ACTIONS[tone], seed, category.length + 23);

  return {
    category,
    title: CATEGORY_TITLES[category],
    content: `${opener} ${framing}: ${sentences.join(' ')} ${action}`.replace(/\s+/g, ' ').trim(),
  };
}

/** A one-line headline for the whole period. */
export function buildSummary(
  aspects: TransitAspect[],
  seed: number,
  period: HoroscopePeriod,
): string {
  const tone = overallTone(aspects);
  const framing = pick(PERIOD_FRAMING[period], seed, 101);

  if (tone === 'quiet' || aspects.length === 0) {
    return `A quiet stretch in your chart ${framing} — few strong influences are active.`;
  }

  const lead = aspects[0];
  const descriptor =
    tone === 'supportive' ? 'largely supportive'
    : tone === 'challenging' ? 'demanding but productive'
    : 'mixed, with support and friction side by side';

  return `${framing.charAt(0).toUpperCase() + framing.slice(1)} looks ${descriptor}, led by ${lead.transitPlanet} ${lead.aspect} your ${lead.natalPlanet}.`;
}

/** All four sections, each from its own events. */
export function buildAllCategories(
  aspects: TransitAspect[],
  seed: number,
  start: Date,
  period: HoroscopePeriod,
): CategorizedReading[] {
  const categories: ForecastCategory[] = ['overview', 'love', 'career', 'wellness'];
  return categories.map((c) => buildCategory(c, aspects, seed, start, period));
}

/** Closing caution. Kept separate so the screen can style it differently. */
export function buildCaution(seed: number): string {
  return pick(CAUTIONS, seed, 997);
}
