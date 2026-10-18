// Checks for services/compass.ts — directions from home (local space).
// Run: bun tools/compass.test.ts
import { planetDirections, distanceKm, bearingDeg, compassPoint, compassWords, citiesToward, nearestCity, localTimeIn, citiesOnLine, assignRings, ON_LINE_KM, MAX_DEVIATION_DEG } from '../expo/services/compass.ts';
import { planetLines, julianDayUT, gmstDeg, norm180, formatMiles, type BirthMoment } from '../expo/services/places.ts';
import { CITIES } from '../expo/data/cities.ts';

let fail = 0;
const ok = (n: string, c: boolean, d = '') => { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`); };
const city = (n: string) => CITIES.find(c => c.name === n)!;

// Sun on the meridian: due south from the north, due north from the south, at altitude 90 − |lat − dec|.
const solstice: BirthMoment = { year: 2026, month: 6, day: 21, hour: 12, minute: 0, utcOffsetMinutes: 0 };
const sunLine = planetLines(solstice).find(l => l.planet === 'Sun')!;
const north = planetDirections(solstice, { lat: 34, lon: sunLine.mcLon }).find(p => p.planet === 'Sun')!;
ok('meridian Sun is due south at 34°N', Math.abs(norm180(north.azimuth - 180)) < 0.01, north.azimuth.toFixed(3));
ok('meridian Sun altitude = 90 − lat + dec', Math.abs(north.altitude - (90 - 34 + sunLine.dec)) < 0.01, `${north.altitude.toFixed(3)} vs ${(90 - 34 + sunLine.dec).toFixed(3)}`);
ok('solstice declination ≈ +23.44°', Math.abs(sunLine.dec - 23.44) < 0.05, sunLine.dec.toFixed(3));
const south = planetDirections(solstice, { lat: -34, lon: sunLine.mcLon }).find(p => p.planet === 'Sun')!;
ok('meridian Sun is due north at 34°S', Math.abs(norm180(south.azimuth)) < 0.01, south.azimuth.toFixed(3));

// Equinox sunrise on the equator: due east, on the horizon.
const equinox: BirthMoment = { year: 2026, month: 3, day: 20, hour: 14, minute: 46, utcOffsetMinutes: 0 };
const eqSun = planetLines(equinox).find(l => l.planet === 'Sun')!;
const riseLon = norm180(eqSun.ra - 90 - gmstDeg(julianDayUT(equinox)));
const rise = planetDirections(equinox, { lat: 0, lon: riseLon }).find(p => p.planet === 'Sun')!;
ok('equinox sunrise on the equator is due east', Math.abs(rise.azimuth - 90) < 0.5 && Math.abs(rise.altitude) < 0.5, `az ${rise.azimuth.toFixed(2)}, alt ${rise.altitude.toFixed(2)}`);

// Every direction is a valid compass angle and altitude.
const demo: BirthMoment = { year: 1990, month: 7, day: 15, hour: 14, minute: 30, utcOffsetMinutes: -420 };
const dirs = planetDirections(demo, city('Los Angeles'));
ok('five planets, angles in range', dirs.length === 5 && dirs.every(d => d.azimuth >= 0 && d.azimuth < 360 && Math.abs(d.altitude) <= 90));
console.log('      demo from LA:', dirs.map(d => `${d.planet} ${compassPoint(d.azimuth)} ${d.azimuth.toFixed(0)}° alt ${d.altitude.toFixed(0)}°`).join(' · '));

// Great circles against published figures.
const nyc = city('New York'), lon = city('London'), la = city('Los Angeles'), tok = city('Tokyo');
ok('New York → London ≈ 5,570 km', Math.abs(distanceKm(nyc, lon) - 5570) < 30, distanceKm(nyc, lon).toFixed(0));
ok('New York → London heads ≈ 51° (NE)', Math.abs(bearingDeg(nyc, lon) - 51.2) < 1.5, bearingDeg(nyc, lon).toFixed(1));
ok('London → New York heads ≈ 288° (WNW)', Math.abs(bearingDeg(lon, nyc) - 288.3) < 1.5, bearingDeg(lon, nyc).toFixed(1));
ok('Los Angeles → Tokyo ≈ 8,800 km', Math.abs(distanceKm(la, tok) - 8800) < 80, distanceKm(la, tok).toFixed(0));

// Compass words
ok('compass points', compassPoint(0) === 'N' && compassPoint(45) === 'NE' && compassPoint(247.5) === 'WSW' && compassPoint(359) === 'N' && compassPoint(180) === 'S');
ok('compass words', compassWords(247.5) === 'west-southwest' && compassWords(45) === 'northeast' && compassWords(90) === 'east');

// citiesToward: brute force over many homes and directions.
let bad = 0, total = 0;
for (const home of CITIES.filter((_, i) => i % 7 === 0)) {
  for (let az = 0; az < 360; az += 15) {
    const got = citiesToward(home, az, CITIES, 100);
    total += got.length;
    const expect = CITIES.filter(c => {
      const d = distanceKm(home, c); if (d < 150) return false;
      const delta = norm180(bearingDeg(home, c) - az); if (Math.abs(delta) > MAX_DEVIATION_DEG) return false;
      return Math.abs(Math.asin(Math.sin(d / 6371) * Math.sin(delta * Math.PI / 180)) * 6371) <= ON_LINE_KM;
    });
    const sorted = got.every((g, i) => i === 0 || got[i - 1].distanceKm <= g.distanceKm);
    if (got.length !== expect.length || !sorted || got.some(g => g.offLineKm > ON_LINE_KM)) bad++;
  }
}
ok('citiesToward finds every city on the line, nearest first', bad === 0, `${total} hits checked, ${bad} bad`);
ok('New York toward London includes London', citiesToward(nyc, bearingDeg(nyc, lon), CITIES, 20).some(c => c.city.name === 'London'));

// Full line: both halves, each city on the half it claims, nearest first.
let fullBad = 0, fullTotal = 0, fullOpp = 0;
for (const home of CITIES.filter((_, i) => i % 5 === 0)) {
  for (let az = 0; az < 360; az += 20) {
    const got = citiesOnLine(home, az, CITIES, 100);
    const fwd = citiesToward(home, az, CITIES, 100).map(c => c.city.name);
    const back = citiesToward(home, az + 180, CITIES, 100).map(c => c.city.name);
    fullTotal += got.length; fullOpp += got.filter(g => !g.toward).length;
    const right = got.every(g => (g.toward ? fwd : back).includes(g.city.name) && Math.abs(norm180(g.bearing - (g.toward ? az : az + 180))) <= MAX_DEVIATION_DEG);
    const sorted = got.every((g, i) => i === 0 || got[i - 1].distanceKm <= g.distanceKm);
    if (!right || !sorted || got.length !== new Set([...fwd, ...back]).size) fullBad++;
  }
}
ok('citiesOnLine covers both halves correctly', fullBad === 0, `${fullTotal} hits (${fullOpp} on the far half), ${fullBad} bad`);
const demoFromLA = planetDirections(demo, la).map(d => citiesOnLine(la, d.azimuth).length);
ok('demo from LA: every life area has cities on its line', demoFromLA.every(n => n > 0), demoFromLA.join(','));

// Every listed city really lies in the direction the card names (within 15°).
const westFromLA = citiesOnLine(la, 270, CITIES, 20);
ok('a west line from LA lists no city off-axis', westFromLA.every(c => Math.abs(norm180(c.bearing - (c.toward ? 270 : 90))) <= MAX_DEVIATION_DEG), westFromLA.map(c => `${c.city.name} ${c.bearing.toFixed(0)}°`).join(', '));
ok('San Diego (SE of LA) is not on the LA west–east line', !westFromLA.some(c => c.city.name === 'San Diego'));

// Marker rings: a five-planet stellium stays on real rings, never at or past the centre.
const RINGS = [104, 72, 40];
const stellium = assignRings([240, 241, 243, 247, 250], RINGS, 30);
ok('stellium markers stay on the three rings', stellium.every(r => RINGS.includes(r)), stellium.join(','));
ok('first three of a stellium use all three rings', new Set(stellium.slice(0, 3)).size === 3, stellium.join(','));
const spread = assignRings([0, 72, 144, 216, 288], RINGS, 30);
ok('well-spread planets all sit on the outer ring', spread.every(r => r === 104), spread.join(','));
const pair = assignRings([10, 12], RINGS, 30);
ok('two close planets split across rings', pair[0] !== pair[1], pair.join(','));

// Nearest city and local time
ok('nearest city to downtown LA is Los Angeles', nearestCity(34.05, -118.25)?.city.name === 'Los Angeles');
ok('local time formats', /^\d{1,2}:\d{2}\s?[AP]M$/.test(localTimeIn('Asia/Tokyo', new Date(Date.UTC(2026, 0, 1, 3, 5))) ?? ''), localTimeIn('Asia/Tokyo', new Date(Date.UTC(2026, 0, 1, 3, 5))) ?? 'null');
ok('local time is correct for Tokyo (UTC+9)', (localTimeIn('Asia/Tokyo', new Date(Date.UTC(2026, 0, 1, 3, 5))) ?? '').startsWith('12:05'));
ok('bad zone gives null, not a crash', localTimeIn('Not/AZone') === null);

ok('distance format', formatMiles(5570) === '3,460 mi' && formatMiles(150) === '95 mi' && formatMiles(16000) === '9,940 mi' && formatMiles(5) === 'under 10 mi', `${formatMiles(5570)}, ${formatMiles(150)}, ${formatMiles(16000)}`);

console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
