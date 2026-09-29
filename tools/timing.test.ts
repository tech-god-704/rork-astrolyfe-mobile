// Checks for services/places-timing.ts — when a place is "switched on".
// Run: bun tools/timing.test.ts
import { activationWindows, placeTiming, formatWindow, describeWindow, sharedWindow } from '../expo/services/places-timing.ts';
import { longitudeOf, julianDayFromDate } from '../expo/services/ephemeris.ts';
import { T } from '../expo/services/natal.ts';
import { angularSeparation } from '../expo/services/transit-aspects.ts';
import { julianDayUT, type BirthMoment, type PlacePlanet } from '../expo/services/places.ts';

let fail = 0;
const ok = (n: string, c: boolean, d = '') => { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`); };
const demo: BirthMoment = { year: 1990, month: 7, day: 15, hour: 14, minute: 30, utcOffsetMinutes: -420 };
const from = new Date(2026, 8, 29, 9, 0);

// Known answer: the Sun returns to its birth position around the birthday every year.
const sun = activationWindows(demo, 'Sun', from, 365).filter(w => w.activator === 'Sun' && w.aspect === 'conjunction');
ok('one solar return in a year', sun.length === 1, `${sun.length}`);
ok('solar return peaks within a day of July 15', sun.length === 1 && Math.abs(sun[0].peak.getTime() - new Date(2027, 6, 15, 12).getTime()) <= 86400e3 * 1.01, sun[0] && sun[0].peak.toDateString());
ok('Sun window spans ~6-7 days (3° orb, ~1°/day)', sun.length === 1 && (() => { const d = Math.round((sun[0].end.getTime() - sun[0].start.getTime()) / 86400e3) + 1; return d >= 5 && d <= 8; })());

// Known sky: Jupiter is in Leo (120°–150°) in late September 2026.
const jup = longitudeOf('Jupiter', T(julianDayFromDate(new Date(Date.UTC(2026, 8, 29, 12)))));
ok('Jupiter in Leo on 2026-09-29', jup >= 120 && jup < 150, jup.toFixed(2));

// Every window is genuinely in orb, and the days either side are not (unless at the scan edge).
const ORB = { Jupiter: 2, Venus: 3, Sun: 3, Mars: 3 } as const;
const ANG = { conjunction: 0, trine: 120, sextile: 60 } as const;
const orbAt = (b: BirthMoment, natal: PlacePlanet, act: keyof typeof ORB, asp: keyof typeof ANG, d: Date) =>
  Math.abs(angularSeparation(longitudeOf(act, T(julianDayFromDate(d))), longitudeOf(natal, T(julianDayUT(b)))) - ANG[asp]);
let rnd = 11; const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
let checked = 0, bad = 0;
for (let i = 0; i < 40; i++) {
  const b: BirthMoment = { year: 1950 + Math.floor(r() * 55), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28), hour: Math.floor(r() * 24), minute: 0, utcOffsetMinutes: 0 };
  for (const natal of ['Sun', 'Moon', 'Venus', 'Mars', 'Jupiter'] as PlacePlanet[]) {
    const last = new Date(from); last.setHours(12, 0, 0, 0); last.setDate(last.getDate() + 365);
    for (const w of activationWindows(b, natal, from, 365)) {
      checked++;
      const o = ORB[w.activator];
      const inside = [w.start, w.peak, w.end].every(d => orbAt(b, natal, w.activator, w.aspect, d) <= o + 1e-9);
      const before = new Date(w.start); before.setDate(before.getDate() - 1);
      const after = new Date(w.end); after.setDate(after.getDate() + 1);
      const edgeStart = w.start.toDateString() === new Date(new Date(from).setHours(12, 0, 0, 0)).toDateString();
      const edgeEnd = w.end.toDateString() === last.toDateString();
      const outside = (edgeStart || orbAt(b, natal, w.activator, w.aspect, before) > o) && (edgeEnd || orbAt(b, natal, w.activator, w.aspect, after) > o);
      const peakInRange = w.peak >= w.start && w.peak <= w.end;
      if (!(inside && outside && peakInRange && w.score > 0)) bad++;
    }
  }
}
ok('every window is in orb and bounded correctly', bad === 0, `${checked} windows checked, ${bad} bad`);

// placeTiming semantics
const pt = placeTiming(demo, 'Venus', from);
const today = new Date(from); today.setHours(12, 0, 0, 0);
ok('"now" window contains today', !pt.now || (pt.now.start <= today && pt.now.end >= today));
ok('"best" and "next" start after today', (!pt.best || pt.best.start > today) && (!pt.next || pt.next.start > today));
ok('there is an upcoming window within a year', !!pt.best && !!pt.next);
console.log('      Venus now:', pt.now ? `${describeWindow(pt.now, 'Venus')} (${formatWindow(pt.now)})` : '—');
console.log('      Venus best:', pt.best ? `${describeWindow(pt.best, 'Venus')} (${formatWindow(pt.best)})` : '—');

// Speed: a screen computes up to 6 of these
const t0 = performance.now();
for (const p of ['Sun', 'Moon', 'Venus', 'Mars', 'Jupiter'] as PlacePlanet[]) placeTiming(demo, p, from);
const ms = performance.now() - t0;
ok('five planets timed in under 150 ms', ms < 150, `${ms.toFixed(0)} ms`);

// Couples: the shared window must sit inside both people's own windows, and not be in the past.
let sharedBad = 0, sharedNone = 0, sharedLive = 0;
rnd = 5;
for (let i = 0; i < 60; i++) {
  const mk = (): BirthMoment => ({ year: 1960 + Math.floor(r() * 45), month: 1 + Math.floor(r() * 12), day: 1 + Math.floor(r() * 28), hour: Math.floor(r() * 24), minute: 0, utcOffsetMinutes: 0 });
  const a = mk(), b = mk();
  const sw = sharedWindow(a, b, 'Venus', from);
  if (!sw) { sharedNone++; continue; }
  if (sw.live) sharedLive++;
  const inside = (w: { start: Date; end: Date }) => w.start <= sw.start && w.end >= sw.end;
  const aw = activationWindows(a, 'Venus', from), bw = activationWindows(b, 'Venus', from);
  const ok1 = inside(sw.mine) && inside(sw.theirs) && aw.some(w => w.start.getTime() === sw.mine.start.getTime()) && bw.some(w => w.start.getTime() === sw.theirs.start.getTime());
  const ok2 = sw.end >= today && sw.start <= sw.end && (sw.live === (sw.start <= today));
  if (!(ok1 && ok2)) sharedBad++;
}
ok('shared windows sit inside both people\'s windows', sharedBad === 0, `60 couples: ${60 - sharedNone} with a shared window (${sharedLive} live now), ${sharedBad} bad`);
ok('most couples get a shared window within a year', sharedNone < 30, `${sharedNone}/60 without`);

// Formatting
const D = (m: number, d: number, y = 2027) => new Date(y, m - 1, d, 12);
ok('format same month', formatWindow({ start: D(3, 4), end: D(3, 19) }) === 'Mar 4 – 19');
ok('format across months', formatWindow({ start: D(3, 28), end: D(4, 6) }) === 'Mar 28 – Apr 6');
ok('format single day', formatWindow({ start: D(3, 4), end: D(3, 4) }) === 'Mar 4');
ok('format across years', formatWindow({ start: D(12, 28, 2026), end: D(1, 3, 2027) }) === 'Dec 28 – Jan 3, 2027');

console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
