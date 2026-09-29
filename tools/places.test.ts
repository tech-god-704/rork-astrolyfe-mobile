import { planetLines, lineLonAt, placesForTheme, readCity, julianDayUT, THEMES, formatMiles, type BirthMoment } from '../expo/services/places.ts';
import { CITIES } from '../expo/data/cities.ts';

let fail = 0;
const ok = (name: string, cond: boolean, detail = '') => { if (!cond) fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };
const sun = (b: BirthMoment) => planetLines(b).find((l) => l.planet === 'Sun')!;
const utc = (y: number, m: number, d: number, h: number, min = 0): BirthMoment => ({ year: y, month: m, day: d, hour: h, minute: min, utcOffsetMinutes: 0 });

// 1. Sun's Midheaven line = where it is apparent solar noon. Expected longitude comes
//    from the equation of time (NOAA): Mar 20 -7.5 min, Jun 21 -1.8 min, Nov 3 +16.4 min.
//    At 12:00 UTC the Sun culminates at longitude = -EoT(min)/4.
for (const [label, b, eot] of [
  ['Mar 20 2024', utc(2024, 3, 20, 12), -7.5],
  ['Jun 21 2024', utc(2024, 6, 21, 12), -1.8],
  ['Nov 3 2024',  utc(2024, 11, 3, 12), 16.4],
] as const) {
  const expected = -eot / 4;
  const got = sun(b).mcLon;
  ok(`Sun MC at solar noon, ${label}`, Math.abs(got - expected) < 0.1, `got ${got.toFixed(2)}°, expected ${expected.toFixed(2)}°`);
}

// 2. Solstice declination
const jun = sun(utc(2024, 6, 20, 21));
ok('Sun declination at June solstice ≈ +23.44°', Math.abs(jun.dec - 23.44) < 0.05, `${jun.dec.toFixed(3)}°`);
const dec21 = sun(utc(2024, 12, 21, 9));
ok('Sun declination at Dec solstice ≈ -23.44°', Math.abs(dec21.dec + 23.44) < 0.05, `${dec21.dec.toFixed(3)}°`);

// 3. Geometry
const l = sun(utc(2024, 3, 20, 12));
ok('IC is 180° from MC', Math.abs((((lineLonAt(l,'IC',0)! - l.mcLon) % 360) + 360) % 360 - 180) < 1e-9);
const anyLine = planetLines(utc(2000, 1, 1, 0)).find(p => p.planet === 'Venus')!;
ok('At the equator ASC/DSC sit exactly 90° from MC',
   Math.abs(((anyLine.mcLon - lineLonAt(anyLine,'ASC',0)! + 360) % 360) - 90) < 1e-9 &&
   Math.abs(((lineLonAt(anyLine,'DSC',0)! - anyLine.mcLon + 360) % 360) - 90) < 1e-9);
ok('Midnight sun: no Sun rising line at 70°N in June', lineLonAt(jun, 'ASC', 70) === null);

// 4. Time handling
const pdt: BirthMoment = { year: 1990, month: 7, day: 15, hour: 14, minute: 30, utcOffsetMinutes: -420 };
ok('14:30 PDT == 21:30 UTC', Math.abs(julianDayUT(pdt) - julianDayUT(utc(1990, 7, 15, 21, 30))) < 1e-9);
const late: BirthMoment = { year: 1990, month: 7, day: 15, hour: 20, minute: 0, utcOffsetMinutes: -420 };
ok('20:00 PDT rolls to 03:00 UTC next day', Math.abs(julianDayUT(late) - julianDayUT(utc(1990, 7, 16, 3))) < 1e-9);

// 5. Output sanity on the demo account (1990-07-15 14:30 Los Angeles)
for (const th of THEMES) {
  const hits = placesForTheme(pdt, th.key, 4);
  ok(`${th.label}: hits sorted, in range`, hits.every((h, i) => h.distanceKm <= 600 && (i === 0 || hits[i-1].distanceKm <= h.distanceKm)), 
     hits.map(h => `${h.city.name} (${h.angle}, ${formatMiles(h.distanceKm)})`).join(', ') || 'none');
}
const la = CITIES.find(c => c.name === 'Los Angeles')!;
console.log('   Los Angeles reads:', readCity(pdt, la).map(h => `${h.planet} ${h.angle} ${formatMiles(h.distanceKm)}`).join(', ') || 'nothing nearby');
ok('every city has valid coordinates', CITIES.every(c => Math.abs(c.lat) <= 90 && Math.abs(c.lon) <= 180));
ok('no duplicate city names', new Set(CITIES.map(c => c.name)).size === CITIES.length);

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
