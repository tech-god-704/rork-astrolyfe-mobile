/**
 * Local natal chart calculator — no external API needed.
 *
 * Uses JPL orbital elements (Standish 1992) for planets and
 * Meeus lunar theory for the Moon. Accurate to ~1° for all
 * planets, which is more than sufficient for astrology.
 *
 * Covers birth dates 1900–2050 AD.
 */

// ── Types ──────────────────────────────────────────────────

export interface NatalPlanet {
  name: string;
  sign: string;
  signLord: string;
  fullDegree: number;
  normDegree: number;
  isRetro: string;
  house: number;
}

export interface NatalChartResult {
  planets: NatalPlanet[];
  ascendant: number | null;
  ascendantSign: string | null;
}

// ── Constants ──────────────────────────────────────────────

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const SIGN_RULERS: Record<string, string> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune',
};

// JPL Keplerian elements at J2000.0 and rates per Julian century
// Source: "Keplerian Elements for Approximate Positions of the Major Planets"
// Standish (1992), valid 1800–2050 AD
interface OrbitalElements {
  a: number; e: number; I: number; L: number; w: number; O: number;
  aR: number; eR: number; IR: number; LR: number; wR: number; OR: number;
}

const ELEMENTS: Record<string, OrbitalElements> = {
  Mercury: {
    a: 0.38709927, e: 0.20563593, I: 7.00497902, L: 252.25032350, w: 77.45779628, O: 48.33076593,
    aR: 0.00000037, eR: 0.00001906, IR: -0.00594749, LR: 149472.67411175, wR: 0.16047689, OR: -0.12534081,
  },
  Venus: {
    a: 0.72333566, e: 0.00677672, I: 3.39467605, L: 181.97909950, w: 131.60246718, O: 76.67984255,
    aR: 0.00000390, eR: -0.00004107, IR: -0.00078890, LR: 58517.81538729, wR: 0.00268329, OR: -0.27769418,
  },
  Earth: {
    a: 1.00000261, e: 0.01671123, I: -0.00001531, L: 100.46457166, w: 102.93768193, O: 0.0,
    aR: 0.00000562, eR: -0.00004392, IR: -0.01294668, LR: 35999.37244981, wR: 0.32327364, OR: 0.0,
  },
  Mars: {
    a: 1.52371034, e: 0.09339410, I: 1.84969142, L: -4.55343205, w: -23.94362959, O: 49.55953891,
    aR: 0.00001847, eR: 0.00007882, IR: -0.00813131, LR: 19140.30268499, wR: 0.44441088, OR: -0.29257343,
  },
  Jupiter: {
    a: 5.20288700, e: 0.04838624, I: 1.30439695, L: 34.39644051, w: 14.72847983, O: 100.47390909,
    aR: -0.00011607, eR: -0.00013253, IR: -0.00183714, LR: 3034.74612775, wR: 0.21252668, OR: 0.20469106,
  },
  Saturn: {
    a: 9.53667594, e: 0.05386179, I: 2.48599187, L: 49.95424423, w: 92.59887831, O: 113.66242448,
    aR: -0.00125060, eR: -0.00050991, IR: 0.00193609, LR: 1222.49362201, wR: -0.41897216, OR: -0.28867794,
  },
  Uranus: {
    a: 19.18916464, e: 0.04725744, I: 0.77263783, L: 313.23810451, w: 170.95427630, O: 74.01692503,
    aR: -0.00196176, eR: -0.00004397, IR: -0.00242939, LR: 428.48202785, wR: 0.40805281, OR: 0.04240589,
  },
  Neptune: {
    a: 30.06992276, e: 0.00859048, I: 1.77004347, L: -55.12002969, w: 44.96476227, O: 131.78422574,
    aR: 0.00026291, eR: 0.00005105, IR: 0.00035372, LR: 218.45945325, wR: -0.32241464, OR: -0.00508664,
  },
  Pluto: {
    a: 39.48211675, e: 0.24882730, I: 17.14001206, L: 238.92903833, w: 224.06891629, O: 110.30393684,
    aR: -0.00031596, eR: 0.00005170, IR: 0.00004818, LR: 145.20780515, wR: -0.04062942, OR: -0.01183482,
  },
};

// ── Math helpers ───────────────────────────────────────────

function norm360(d: number): number {
  d = d % 360;
  return d < 0 ? d + 360 : d;
}

function julianDay(y: number, m: number, d: number, h: number = 12): number {
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + h / 24 + B - 1524.5;
}

function T(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/** Solve Kepler's equation M = E - e·sin(E) via Newton–Raphson */
function kepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 15; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

// ── Heliocentric position ──────────────────────────────────

function helioXYZ(el: OrbitalElements, t: number): { x: number; y: number; z: number } {
  const a = el.a + el.aR * t;
  const e = el.e + el.eR * t;
  const Irad = (el.I + el.IR * t) * DEG;
  const Ldeg = norm360(el.L + el.LR * t);
  const wDeg = norm360(el.w + el.wR * t);
  const Odeg = norm360(el.O + el.OR * t);

  const omega = (wDeg - Odeg) * DEG; // argument of perihelion
  const M = norm360(Ldeg - wDeg) * DEG; // mean anomaly

  const E = kepler(M, e);

  // Position in orbital plane
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate to ecliptic
  const cosO = Math.cos(Odeg * DEG);
  const sinO = Math.sin(Odeg * DEG);
  const cosI = Math.cos(Irad);
  const sinI = Math.sin(Irad);
  const cosW = Math.cos(omega);
  const sinW = Math.sin(omega);

  return {
    x: (cosO * cosW - sinO * sinW * cosI) * xp + (-cosO * sinW - sinO * cosW * cosI) * yp,
    y: (sinO * cosW + cosO * sinW * cosI) * xp + (-sinO * sinW + cosO * cosW * cosI) * yp,
    z: (sinW * sinI) * xp + (cosW * sinI) * yp,
  };
}

// ── Geocentric longitudes ──────────────────────────────────

function geocentricLon(planet: string, t: number): number {
  const p = helioXYZ(ELEMENTS[planet], t);
  const e = helioXYZ(ELEMENTS.Earth, t);
  return norm360(Math.atan2(p.y - e.y, p.x - e.x) * RAD);
}

function sunLon(t: number): number {
  const e = helioXYZ(ELEMENTS.Earth, t);
  return norm360(Math.atan2(-e.y, -e.x) * RAD);
}

/**
 * Moon's ecliptic longitude — main terms of Meeus/ELP theory.
 * Accurate to ~0.3°.
 */
function moonLon(t: number): number {
  const Lp = norm360(218.3164477 + 481267.88123421 * t);
  const D  = norm360(297.8501921 + 445267.1114034  * t);
  const M  = norm360(357.5291092 + 35999.0502909   * t);
  const Mp = norm360(134.9633964 + 477198.8675055   * t);
  const F  = norm360(93.2720950  + 483202.0175233   * t);

  // Longitude perturbation terms (micro-degrees)
  let sl = 0;
  sl += 6288774 * Math.sin(Mp * DEG);
  sl += 1274027 * Math.sin((2 * D - Mp) * DEG);
  sl += 658314  * Math.sin(2 * D * DEG);
  sl += 213618  * Math.sin(2 * Mp * DEG);
  sl -= 185116  * Math.sin(M * DEG);
  sl -= 114332  * Math.sin(2 * F * DEG);
  sl += 58793   * Math.sin((2 * D - 2 * Mp) * DEG);
  sl += 57066   * Math.sin((2 * D - M - Mp) * DEG);
  sl += 53322   * Math.sin((2 * D + Mp) * DEG);
  sl += 45758   * Math.sin((2 * D - M) * DEG);
  sl -= 40923   * Math.sin((M - Mp) * DEG);
  sl -= 34720   * Math.sin(D * DEG);
  sl -= 30383   * Math.sin((M + Mp) * DEG);
  sl += 15327   * Math.sin((2 * D - 2 * F) * DEG);
  sl -= 12528   * Math.sin((Mp + 2 * F) * DEG);
  sl += 10980   * Math.sin((Mp - 2 * F) * DEG);
  sl += 10675   * Math.sin((4 * D - Mp) * DEG);
  sl += 10034   * Math.sin(3 * Mp * DEG);
  sl += 8548    * Math.sin((4 * D - 2 * Mp) * DEG);
  sl -= 7888    * Math.sin((2 * D + M - Mp) * DEG);
  sl -= 6766    * Math.sin((2 * D + M) * DEG);
  sl -= 5163    * Math.sin((D - Mp) * DEG);
  sl += 4987    * Math.sin((D + M) * DEG);
  sl += 4036    * Math.sin((2 * D - M + Mp) * DEG);

  return norm360(Lp + sl / 1000000);
}

// ── Retrograde detection ───────────────────────────────────

function isRetro(planet: string, t: number): boolean {
  if (planet === 'Sun' || planet === 'Moon') return false;
  const step = 1 / 36525; // 1 day in centuries
  const lon1 = geocentricLon(planet, t - step);
  const lon2 = geocentricLon(planet, t);
  let diff = lon2 - lon1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

// ── Ascendant ──────────────────────────────────────────────

function calcAscendant(jd: number, lat: number, lon: number): number {
  const t = T(jd);
  const eps = (23.4393 - 0.0130 * t) * DEG;
  const D = jd - 2451545.0;
  const gmst = norm360(280.46061837 + 360.98564736629 * D);
  const lst = norm360(gmst + lon) * DEG;

  const asc = Math.atan2(
    Math.cos(lst),
    -(Math.sin(eps) * Math.tan(lat * DEG) + Math.cos(eps) * Math.sin(lst)),
  );
  return norm360(asc * RAD);
}

// ── Sign helpers ───────────────────────────────────────────

function lonToSign(lon: number): { sign: string; degree: number; index: number } {
  const n = norm360(lon);
  const idx = Math.floor(n / 30) % 12;
  return { sign: SIGNS[idx], degree: n - idx * 30, index: idx };
}

function houseOf(planetIdx: number, refIdx: number): number {
  let h = planetIdx - refIdx + 1;
  if (h <= 0) h += 12;
  return h;
}

// ── Interpretations ────────────────────────────────────────

const PLANET_DESC: Record<string, string> = {
  Sun: 'Your core identity and life purpose',
  Moon: 'Your emotional instincts and inner needs',
  Mercury: 'How you think, learn, and communicate',
  Venus: 'How you love, attract, and find beauty',
  Mars: 'Your drive, energy, and assertiveness',
  Jupiter: 'Where you find growth, luck, and wisdom',
  Saturn: 'Your discipline, responsibility, and lessons',
  Uranus: 'Where you seek freedom and innovation',
  Neptune: 'Your dreams, intuition, and spirituality',
  Pluto: 'Your power, transformation, and rebirth',
};

const SIGN_ENERGY: Record<string, string> = {
  Aries: 'bold courage and pioneering initiative',
  Taurus: 'steadfast loyalty and sensual pleasure',
  Gemini: 'intellectual curiosity and versatile expression',
  Cancer: 'nurturing empathy and emotional depth',
  Leo: 'radiant confidence and generous warmth',
  Virgo: 'analytical precision and devoted service',
  Libra: 'harmonious diplomacy and aesthetic grace',
  Scorpio: 'intense passion and transformative power',
  Sagittarius: 'adventurous optimism and philosophical wisdom',
  Capricorn: 'ambitious discipline and enduring patience',
  Aquarius: 'innovative vision and humanitarian ideals',
  Pisces: 'compassionate imagination and spiritual depth',
};

export function getInterpretation(planet: string, sign: string): string {
  const desc = PLANET_DESC[planet] || 'A celestial influence';
  const energy = SIGN_ENERGY[sign] || 'unique energy';
  return `${desc}. In ${sign}, this expresses through ${energy}.`;
}

// ── Public API ─────────────────────────────────────────────

export function calculateNatalChart(params: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  latitude?: number;
  longitude?: number;
}): NatalChartResult {
  const { year, month, day, hour = 12, minute = 0, latitude, longitude } = params;

  const jd = julianDay(year, month, day, hour + minute / 60);
  const t = T(jd);

  // Ascendant (requires location)
  let ascLon: number | null = null;
  let ascSign: string | null = null;
  let ascIdx = 0;

  if (latitude != null && longitude != null) {
    ascLon = calcAscendant(jd, latitude, longitude);
    const info = lonToSign(ascLon);
    ascSign = info.sign;
    ascIdx = info.index;
  }

  // Fall back to Sun sign as house reference when no location
  const sunDeg = sunLon(t);
  const sunIdx = Math.floor(norm360(sunDeg) / 30) % 12;
  const houseRef = ascLon != null ? ascIdx : sunIdx;

  const PLANET_NAMES = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

  const planets: NatalPlanet[] = PLANET_NAMES.map((name) => {
    let lon: number;
    if (name === 'Sun') lon = sunDeg;
    else if (name === 'Moon') lon = moonLon(t);
    else lon = geocentricLon(name, t);

    const info = lonToSign(lon);

    return {
      name,
      sign: info.sign,
      signLord: SIGN_RULERS[info.sign],
      fullDegree: Math.round(norm360(lon) * 100) / 100,
      normDegree: Math.round(info.degree * 100) / 100,
      isRetro: isRetro(name, t) ? 'true' : 'false',
      house: houseOf(info.index, houseRef),
    };
  });

  return { planets, ascendant: ascLon, ascendantSign: ascSign };
}
