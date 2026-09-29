import { powerCity, relocatedRising, mapLines, readCity, planetLines, type BirthMoment } from '../expo/services/places.ts';
import { calculateNatalChart } from '../expo/services/natal.ts';
import { CITIES } from '../expo/data/cities.ts';

let fail = 0;
const ok = (n: string, c: boolean, d = '') => { if (!c) fail++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? ` — ${d}` : ''}`); };
const demo: BirthMoment = { year: 1990, month: 7, day: 15, hour: 14, minute: 30, utcOffsetMinutes: -420 };
const LA = { lat: 34.0522, lon: -118.2437 };

// Relocated rising must agree with the Birth Chart screen at the birthplace
const chart = calculateNatalChart({ year: 1990, month: 7, day: 15, hour: 14, minute: 30, latitude: LA.lat, longitude: LA.lon, utcOffsetMinutes: -420 });
const home = relocatedRising(demo, LA.lat, LA.lon);
ok('relocated rising at birthplace == Birth Chart rising', home === chart.ascendantSign, `${home} vs ${chart.ascendantSign}`);
const tokyo = CITIES.find(c => c.name === 'Tokyo')!;
const london = CITIES.find(c => c.name === 'London')!;
const risings = [tokyo, london].map(c => `${c.name}: ${relocatedRising(demo, c.lat, c.lon)}`);
ok('relocated rising changes with location', new Set([home, relocatedRising(demo, tokyo.lat, tokyo.lon), relocatedRising(demo, london.lat, london.lon)]).size > 1, `LA: ${home}, ${risings.join(', ')}`);

// Power city: brute-force that no city scores higher
const W = { exact: 3, strong: 2, near: 1 } as const;
const score = (hits: ReturnType<typeof readCity>) => hits.reduce((s, h) => s + W[h.strength], 0);
const pc = powerCity(demo)!;
ok('power city found', !!pc, pc ? `${pc.city.name}: ${pc.hits.map(h => `${h.planet} ${h.angle}`).join(' + ')}` : '');
const maxScore = Math.max(...CITIES.map(c => score(readCity(demo, c))));
ok('power city has the highest score of any city', score(pc.hits) === maxScore, `${score(pc.hits)} vs max ${maxScore}`);
ok('power city hits match readCity', JSON.stringify(pc.hits) === JSON.stringify(readCity(demo, pc.city)));
ok('no cities -> null', powerCity(demo, []) === null);

// Map geometry
const venus = planetLines(demo).find(l => l.planet === 'Venus')!;
const m = mapLines(demo, 'Venus');
ok('map MC matches line MC', m.mc === venus.mcLon);
ok('map IC is 180° from MC', Math.abs((((m.ic - m.mc) % 360) + 360) % 360 - 180) < 1e-9);
const allSegs = [...m.asc, ...m.dsc];
ok('no segment jumps across the ±180 seam', allSegs.every(seg => seg.every((p, i) => i === 0 || Math.abs(p[0] - seg[i-1][0]) <= 180)));
ok('every segment has 2+ points', allSegs.every(s => s.length > 1), `${allSegs.length} segments`);
const eq = m.asc.flat().find(p => Math.abs(p[1]) < 1e-9);
ok('ASC crosses the equator 90° west of MC', !!eq && Math.abs((((m.mc - eq![0]) % 360) + 360) % 360 - 90) < 1e-6, eq ? `ASC@0° = ${eq[0].toFixed(2)}, MC = ${m.mc.toFixed(2)}` : 'no equator point');
// Midnight sun: Sun at June solstice has no horizon line above the Arctic circle
const solstice: BirthMoment = { year: 2024, month: 6, day: 20, hour: 21, minute: 0, utcOffsetMinutes: 0 };
const sunMap = mapLines(solstice, 'Sun');
const maxLat = Math.max(...sunMap.asc.flat().map(p => p[1]));
ok('Sun horizon lines stop at the Arctic circle in June', maxLat < 67, `highest ASC point ${maxLat.toFixed(1)}°`);

console.log(fail ? `\n${fail} FAILURE(S)` : '\nALL PASS');
process.exit(fail ? 1 : 0);
