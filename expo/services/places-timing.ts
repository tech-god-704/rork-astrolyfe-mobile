/**
 * When a place is "switched on".
 *
 * A city sits on one of your lines all the time, but the line is loudest while a moving
 * planet makes a supportive aspect to the natal planet that drew it. Jupiter trine your
 * Venus makes every Venus city warmer for those weeks; the Sun crossing your Moon does
 * the same for Moon cities for a few days. This scans the real sky forward day by day
 * and returns those windows, so a place card can say when to go, not just where.
 *
 * Natal and transit longitudes come from the same functions (ephemeris.longitudeOf), so
 * both sit in one frame and the orbs compare like with like.
 */

import { T } from './natal';
import { julianDayFromDate, longitudeOf, addDays } from './ephemeris';
import { angularSeparation } from './transit-aspects';
import { julianDayUT, type BirthMoment, type PlacePlanet } from './places';

export type Activator = 'Sun' | 'Venus' | 'Mars' | 'Jupiter';
export type TimingAspect = 'conjunction' | 'trine' | 'sextile';

const ACTIVATORS: { planet: Activator; orb: number; weight: number }[] = [
  { planet: 'Jupiter', orb: 2, weight: 3 },
  { planet: 'Venus', orb: 3, weight: 2 },
  { planet: 'Sun', orb: 3, weight: 2 },
  { planet: 'Mars', orb: 3, weight: 1.5 },
];

const ASPECTS: { aspect: TimingAspect; angle: number; weight: number }[] = [
  { aspect: 'conjunction', angle: 0, weight: 1.2 },
  { aspect: 'trine', angle: 120, weight: 1 },
  { aspect: 'sextile', angle: 60, weight: 0.8 },
];

export interface TimingWindow {
  activator: Activator;
  aspect: TimingAspect;
  /** First and last day (local noon) the aspect is within orb. */
  start: Date;
  end: Date;
  /** Day the aspect is closest to exact. */
  peak: Date;
  /** Relative strength, for ranking: activator weight x aspect weight x closeness. */
  score: number;
}

const ASPECT_WORD: Record<TimingAspect, string> = {
  conjunction: 'meets',
  trine: 'flows with',
  sextile: 'opens up',
};

/** Plain-English cause, e.g. "Jupiter flows with your Venus". */
export function describeWindow(w: TimingWindow, natal: PlacePlanet): string {
  return `${w.activator} ${ASPECT_WORD[w.aspect]} your ${natal}`;
}

function noon(d: Date): Date {
  const n = new Date(d);
  n.setHours(12, 0, 0, 0);
  return n;
}

/**
 * Every supportive window for one natal planet over the next `days` days, soonest first.
 * A planet's own return (the Sun meeting your natal Sun, and so on) counts as a meeting.
 */
export function activationWindows(
  birth: BirthMoment,
  natal: PlacePlanet,
  from: Date = new Date(),
  days = 365,
): TimingWindow[] {
  const natalLon = longitudeOf(natal, T(julianDayUT(birth)));
  const first = noon(from);

  // One pass over the calendar, reading every activator's position each day.
  const sky: Record<Activator, number[]> = { Jupiter: [], Venus: [], Sun: [], Mars: [] };
  const dates: Date[] = [];
  for (let i = 0; i <= days; i++) {
    const d = addDays(first, i);
    dates.push(d);
    const t = T(julianDayFromDate(d));
    for (const a of ACTIVATORS) sky[a.planet].push(longitudeOf(a.planet, t));
  }

  const windows: TimingWindow[] = [];
  for (const act of ACTIVATORS) {
    for (const asp of ASPECTS) {
      let runStart = -1;
      let bestOrb = Infinity;
      let bestDay = -1;
      const close = (endIdx: number) => {
        windows.push({
          activator: act.planet,
          aspect: asp.aspect,
          start: dates[runStart],
          end: dates[endIdx],
          peak: dates[bestDay],
          score: act.weight * asp.weight * (1 - bestOrb / (act.orb * 2)),
        });
        runStart = -1;
        bestOrb = Infinity;
      };
      for (let i = 0; i < dates.length; i++) {
        const orb = Math.abs(angularSeparation(sky[act.planet][i], natalLon) - asp.angle);
        if (orb <= act.orb) {
          if (runStart < 0) runStart = i;
          if (orb < bestOrb) { bestOrb = orb; bestDay = i; }
        } else if (runStart >= 0) {
          close(i - 1);
        }
      }
      if (runStart >= 0) close(dates.length - 1);
    }
  }
  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export interface PlaceTiming {
  /** A window that includes today, strongest first, if any. */
  now: TimingWindow | null;
  /** The strongest window that has not started yet. */
  best: TimingWindow | null;
  /** The next window to start after today. */
  next: TimingWindow | null;
}

export function placeTiming(birth: BirthMoment, natal: PlacePlanet, from: Date = new Date(), days = 365): PlaceTiming {
  const windows = activationWindows(birth, natal, from, days);
  const today = noon(from).getTime();
  const active = windows.filter((w) => w.start.getTime() <= today && w.end.getTime() >= today);
  const upcoming = windows.filter((w) => w.start.getTime() > today);
  const byScore = (a: TimingWindow, b: TimingWindow) => b.score - a.score;
  return {
    now: [...active].sort(byScore)[0] ?? null,
    best: [...upcoming].sort(byScore)[0] ?? null,
    next: upcoming[0] ?? null,
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar 4 – 19", "Mar 28 – Apr 6", or "Mar 4" for a single day. */
export function formatWindow(w: Pick<TimingWindow, 'start' | 'end'>): string {
  const s = w.start;
  const e = w.end;
  const sm = MONTHS[s.getMonth()];
  const em = MONTHS[e.getMonth()];
  if (s.toDateString() === e.toDateString()) return `${sm} ${s.getDate()}`;
  const yearNote = e.getFullYear() !== s.getFullYear() ? `, ${e.getFullYear()}` : '';
  if (sm === em && !yearNote) return `${sm} ${s.getDate()} – ${e.getDate()}`;
  return `${sm} ${s.getDate()} – ${em} ${e.getDate()}${yearNote}`;
}

export interface SharedWindow {
  /** The days both people's windows overlap. */
  start: Date;
  end: Date;
  mine: TimingWindow;
  theirs: TimingWindow;
  /** True when the overlap includes today. */
  live: boolean;
}

/**
 * The best stretch in the coming year when the same natal planet is switched on for
 * both people at once — for a couple, when their shared love cities are loudest.
 * Prefers an overlap happening now; otherwise the strongest upcoming one.
 */
export function sharedWindow(
  a: BirthMoment,
  b: BirthMoment,
  natal: PlacePlanet = 'Venus',
  from: Date = new Date(),
  days = 365,
): SharedWindow | null {
  const mine = activationWindows(a, natal, from, days);
  const theirs = activationWindows(b, natal, from, days);
  const today = noon(from).getTime();

  let best: (SharedWindow & { score: number }) | null = null;
  for (const m of mine) {
    for (const t of theirs) {
      const start = Math.max(m.start.getTime(), t.start.getTime());
      const end = Math.min(m.end.getTime(), t.end.getTime());
      if (start > end || end < today) continue;
      const live = start <= today;
      const score = m.score + t.score + (live ? 100 : 0);
      if (!best || score > best.score) {
        best = { start: new Date(start), end: new Date(end), mine: m, theirs: t, live, score };
      }
    }
  }
  if (!best) return null;
  const { score: _score, ...shared } = best;
  return shared;
}
