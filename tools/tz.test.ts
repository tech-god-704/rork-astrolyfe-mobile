import { CITIES } from '../expo/data/cities.ts';
let bad = 0;
const offsetHours = (tz: string, d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    .formatToParts(d).filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
  return (asUtc - d.getTime()) / 3600000;
};
const jan = new Date(Date.UTC(2024, 0, 15, 12)), jul = new Date(Date.UTC(2024, 6, 15, 12));
for (const c of CITIES) {
  try {
    const o = offsetHours(c.tz, jan), solar = c.lon / 15;
    // Standard time should sit within ~3.5h of solar time — catches a wrong continent or sign.
    if (Math.abs(o - solar) > 3.5) { bad++; console.log(`SUSPECT ${c.name}: tz ${c.tz} offset ${o}h vs solar ${solar.toFixed(1)}h`); }
  } catch (e) { bad++; console.log(`INVALID ${c.name}: ${c.tz}`); }
}
// Spot checks against known offsets (Jan / Jul)
const spot: [string, number, number][] = [['New York', -5, -4], ['Phoenix', -7, -7], ['London', 0, 1], ['Kathmandu', 5.75, 5.75], ['Sydney', 11, 10], ['Buenos Aires', -3, -3], ['Bali', 8, 8], ['Reykjavík', 0, 0]];
for (const [n, j, u] of spot) {
  const c = CITIES.find(x => x.name === n)!; const gj = offsetHours(c.tz, jan), gu = offsetHours(c.tz, jul);
  if (gj !== j || gu !== u) { bad++; console.log(`WRONG ${n}: got ${gj}/${gu}, expected ${j}/${u}`); }
}
console.log(bad ? `\n${bad} PROBLEM(S)` : `\nALL ${CITIES.length} ZONES VALID + ${spot.length} spot checks exact`);
process.exit(bad ? 1 : 0);
