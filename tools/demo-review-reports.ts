/**
 * Regenerates the App Review demo account's five text reports from the DEMO'S OWN
 * chart, using the app's shipping engine — so every city in a report matches what
 * Places, Soulmate and Couple compute for that account.
 *
 * Why this exists: the reviewer is expected to test Delete Account, which removes the
 * demo account and its reports. Before resubmitting, recreate the account (see
 * HANDOFF.md) and write these five reports to it (user_reports, one row per
 * report_type, user_email = the demo email). The soulmate_portrait row is an image
 * and is not generated here.
 *
 * The demo birth moment below must match the demo profile
 * (date_of_birth 1990-07-15, birth time 14:30, timezone America/Los_Angeles).
 *
 *   bun tools/demo-review-reports.ts          # readable preview
 *   bun tools/demo-review-reports.ts --json   # {report_type: {title, content_html}}
 */
import { placesForTheme, powerCity, relocatedRising, meaningOf, ANGLE_LABEL, formatMiles, type BirthMoment, type PlaceHit } from '../expo/services/places.ts';
import { calculateNatalChart, norm360 } from '../expo/services/natal.ts';
import { planetPositions, addDays } from '../expo/services/ephemeris.ts';

const birth: BirthMoment = { year: 1990, month: 7, day: 15, hour: 14, minute: 30, utcOffsetMinutes: -420 };
const natal = calculateNatalChart({ year: 1990, month: 7, day: 15, hour: 14, minute: 30, latitude: 34.0522, longitude: -118.2437, utcOffsetMinutes: -420 });
const sign = (p: string) => natal.planets.find(x => x.name === p)!.sign;
const lonOf = (p: string) => natal.planets.find(x => x.name === p)!.fullDegree;
const BR = '<br />\n';
const line = (h: PlaceHit) => `- **${h.city.name}, ${h.city.country}** (${ANGLE_LABEL[h.angle]}, ${formatMiles(h.distanceKm)} away): ${meaningOf(h.planet, h.angle)}`;
const join = (parts: string[]) => parts.join(BR);

const love = placesForTheme(birth, 'love', 5), career = placesForTheme(birth, 'career', 5), home = placesForTheme(birth, 'home', 5);
const luck = placesForTheme(birth, 'luck', 3), drive = placesForTheme(birth, 'drive', 3);
const pc = powerCity(birth)!;
const rise = (h: PlaceHit) => relocatedRising(birth, h.city.lat, h.city.lon);
const LIFE: Record<string, string> = { Venus: 'love', Sun: 'career', Moon: 'home', Jupiter: 'luck', Mars: 'drive' };

const full_map = join([
  '**Your World Map**', '*Every line your chart draws around the globe, and the cities where each one is strongest for you.*', '', '---', '',
  `### ☀️ **Sun (${sign('Sun')}): career and recognition**`, ...career.slice(0, 3).map(line), '',
  `### 🌙 **Moon (${sign('Moon')}): home and belonging**`, ...home.slice(0, 3).map(line), '',
  `### ♀️ **Venus (${sign('Venus')}): love and attraction**`, ...love.slice(0, 3).map(line), '',
  `### ⚔️ **Mars (${sign('Mars')}): drive and energy**`, ...drive.map(line), '',
  `### 🪐 **Jupiter (${sign('Jupiter')}): luck and growth**`, ...luck.map(line), '',
  '---', '',
  `### 🌟 **Your power city: ${pc.city.name}**`,
  `${pc.hits.length} of your lines cross here: ${pc.hits.map(h => `${h.planet} (${LIFE[h.planet]})`).join(', ')}. It is the strongest spot on your map. Live here and you'd rise as ${relocatedRising(birth, pc.city.lat, pc.city.lon)}.`,
]);

const venus_love = join([
  '**Love Cities**', `*Your Venus is in ${sign('Venus')}. These are the places where its lines make attraction and connection come easier.*`, '', '---', '',
  '### **Where love comes easier**', ...love.map(line), '',
  '### **Reading your lines**',
  `A **Partner line** is the classic place to meet someone. A **Rising line** makes you magnetic to others. A **Midheaven line** puts your charm on show, and a **Home line** is where a shared life feels beautiful.`, '',
  `### **Your top love city: ${love[0].city.name}**`,
  `Its ${ANGLE_LABEL[love[0].angle].toLowerCase()} passes ${formatMiles(love[0].distanceKm)} away. Live there and you'd rise as ${rise(love[0])}, which changes how you come across when you meet people.`,
]);

const sun_career = join([
  '**Career Cities**', `*Your Sun is in ${sign('Sun')}. These are the places where your work, reputation and leadership get noticed.*`, '', '---', '',
  '### **Where your work shines**', ...career.map(line), '',
  `### **Your top career city: ${career[0].city.name}**`,
  `Its ${ANGLE_LABEL[career[0].angle].toLowerCase()} passes ${formatMiles(career[0].distanceKm)} away. Live there and you'd rise as ${rise(career[0])}.`,
  ...(luck.some(l => career.slice(0, 5).some(c => c.city.name === l.city.name)) ? ['', `Your Jupiter lines run through some of the same cities, adding luck and opportunity to the recognition.`] : []),
]);

const moon_wellbeing = join([
  '**Home & Peace Cities**', `*Your Moon is in ${sign('Moon')}. These are the places where you feel most settled, safe and at ease.*`, '', '---', '',
  '### **Where you feel at home**', ...home.map(line), '',
  '### **Recreating it anywhere**',
  `What these places share is what your Moon needs day to day. When you can't be there, look for the same feeling where you are: routine, familiar comforts, and people who make you feel safe.`, '',
  `### **Your top home city: ${home[0].city.name}**`,
  `Its ${ANGLE_LABEL[home[0].angle].toLowerCase()} passes ${formatMiles(home[0].distanceKm)} away. Live there and you'd rise as ${rise(home[0])}.`,
]);

// Travel Timing: real transits over the next 120 days to the natal Sun, Moon, Venus, Jupiter.
// Windows run from today, so regenerate close to each submission.
const now = new Date();
const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12));
const TRANSITING = ['Venus', 'Jupiter', 'Sun'], NATAL = ['Sun', 'Moon', 'Venus', 'Jupiter'];
const ASPECTS: [string, number][] = [['conjunct', 0], ['trine', 120]];
type W = { t: string; n: string; a: string; from: Date; to: Date; exact: Date; orb: number };
const windows: W[] = []; const open = new Map<string, W>();
for (let d = 0; d < 120; d++) {
  const date = addDays(start, d);
  const pos = planetPositions(date);
  for (const t of TRANSITING) for (const n of NATAL) for (const [a, ang] of ASPECTS) {
    if (t === n && t === 'Sun') continue;
    const tl = pos.find(p => p.name === t)!.longitude;
    const diff = Math.abs(((norm360(tl - lonOf(n)) + 180) % 360) - 180);
    const orb = Math.abs(diff - ang), key = `${t}|${n}|${a}`, cur = open.get(key);
    if (orb <= 1.5) {
      if (!cur) open.set(key, { t, n, a, from: date, to: date, exact: date, orb });
      else { cur.to = date; if (orb < cur.orb) { cur.orb = orb; cur.exact = date; } }
    } else if (cur) { windows.push(cur); open.delete(key); }
  }
}
windows.push(...open.values());
windows.sort((x, y) => x.from.getTime() - y.from.getTime());
const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const citiesFor = (n: string) => placesForTheme(birth, ({ Venus: 'love', Sun: 'career', Moon: 'home', Jupiter: 'luck' } as any)[n], 3).map(h => h.city.name);
const GOOD: Record<string, string> = { Venus: 'warmth, romance and ease', Jupiter: 'luck, growth and open doors', Sun: 'energy and visibility' };
const transit_forecast = join([
  '**Travel Timing**', '*Which of your places are switched on over the next four months, from the real movement of the planets.*', '', '---', '',
  ...(windows.length === 0 ? ['No major windows fall in the next four months; your places carry their usual strength.'] :
    windows.slice(0, 6).flatMap(w => [
      `### **${fmt(w.from)}${w.to > w.from ? ` to ${fmt(w.to)}` : ''}: ${w.t} ${w.a} your ${w.n}**`,
      `Brings ${GOOD[w.t]} to your ${LIFE[w.n]} places, peaking around ${fmt(w.exact)}. Best cities to be in: ${citiesFor(w.n).join(', ')}.`, '',
    ])),
  '---', '', '*Dates are calculated from each planet’s daily position; a window is the stretch when the angle is within 1.5° of exact.*',
]);

const TITLES = { full_map: 'Your World Map', venus_love: 'Love Cities', sun_career: 'Career Cities', moon_wellbeing: 'Home & Peace Cities', transit_forecast: 'Travel Timing' };
const out = { full_map, venus_love, sun_career, moon_wellbeing, transit_forecast };
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, { title: TITLES[k as keyof typeof TITLES], content_html: v }])), null, 2));
} else {
  for (const [k, v] of Object.entries(out)) console.log(`\n══════ ${k}: ${TITLES[k as keyof typeof TITLES]} ══════\n` + v.replaceAll('<br />\n', '\n'));
}
