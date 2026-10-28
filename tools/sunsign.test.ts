// Sun sign worked out from birth details (services/places-birth.ts sunSignFromBirth).
// Run: bun --preload ./tools/rn-stubs.ts tools/sunsign.test.ts
import { sunSignFromBirth } from '../expo/services/places-birth.ts';
const cases: [any, string | null][] = [
  [{ birth_date: '1990-07-15', timezone: 'America/Los_Angeles', quiz_data: { birth_hour: 14, birth_minute: 30 } }, 'Cancer'],
  [{ birth_date: '1990-07-15' }, 'Cancer'],
  [{ birth_date: '2000-01-01' }, 'Capricorn'], [{ birth_date: '1985-03-25' }, 'Aries'], [{ birth_date: '1977-12-25' }, 'Capricorn'],
  [{ birth_date: '1995-08-05' }, 'Leo'], [{ birth_date: '1993-10-10' }, 'Libra'], [{ birth_date: '2001-02-14' }, 'Aquarius'],
  // cusp: 2026 June solstice 08:24 UT -> Cancer from then; 07:00 UT is still Gemini
  [{ birth_date: '2026-06-21', timezone: 'UTC', quiz_data: { birth_hour: 7, birth_minute: 0 } }, 'Gemini'],
  [{ birth_date: '2026-06-21', timezone: 'UTC', quiz_data: { birth_hour: 10, birth_minute: 0 } }, 'Cancer'],
  [{ birth_date: '1990-02-30' }, null], [{ birth_date: '' }, null], [null, null],
  [{ birth_date: '1990-07-15 00:00:00.000Z' }, 'Cancer'],
];
let bad = 0;
for (const [p, want] of cases) { const got = sunSignFromBirth(p); if (got !== want) { bad++; console.log('FAIL', JSON.stringify(p), got, 'want', want); } }
console.log(bad ? `${bad} FAILED` : `ALL PASS (${cases.length})`);
process.exit(bad ? 1 : 0);
