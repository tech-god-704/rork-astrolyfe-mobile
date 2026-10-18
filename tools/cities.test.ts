// Checks for data/cities.ts: free-text birthplace matching and the coordinates-only zone fallback.
// Run: bun tools/cities.test.ts
import { matchCity, zoneNear, CITIES } from '../expo/data/cities.ts';
const cases: [string, string | null][] = [
  ['Los Angeles, CA', 'Los Angeles'], ['los angeles', 'Los Angeles'], ['Los Angeles, CA, USA', 'Los Angeles'],
  ['Los Angeles, United States', 'Los Angeles'], ['Portland, ME', null], ['Portland, OR', 'Portland'],
  ['Birmingham, AL', null], ['Paris, TX', null], ['Paris, France', 'Paris'], ['London, Ontario', null],
  ['London, UK', 'London'], ['London', 'London'], ['Washington, D.C.', 'Washington, D.C.'], ['Washington, D.C., USA', 'Washington, D.C.'],
  ['Perth, WA', 'Perth'], ['Perth, Scotland', null], ['Tokyo, Japan', 'Tokyo'], ['Smallville, KS', null], ['', null],
];
let bad = 0;
for (const [t, want] of cases) { const got = matchCity(t)?.name ?? null; if (got !== want) { bad++; console.log('FAIL', JSON.stringify(t), '->', got, 'want', want); } }
// every picker output "Name, Country" must match back to itself
for (const c of CITIES) if (matchCity(`${c.name}, ${c.country}`)?.name !== c.name) { bad++; console.log('FAIL picker', c.name); }
// zoneNear: LA coords yes; South Bend (41.68,-86.25) and Bullhead City (35.15,-114.57) no
if (zoneNear(34.0522, -118.2437) !== 'America/Los_Angeles') { bad++; console.log('FAIL LA zone'); }
if (zoneNear(41.68, -86.25) !== null) { bad++; console.log('FAIL South Bend', zoneNear(41.68, -86.25)); }
if (zoneNear(35.15, -114.57) !== null) { bad++; console.log('FAIL Bullhead', zoneNear(35.15, -114.57)); }
console.log(bad ? `${bad} FAILED` : `ALL PASS (${cases.length} cases + ${CITIES.length} picker round-trips + 3 zone checks)`);
process.exit(bad ? 1 : 0);
