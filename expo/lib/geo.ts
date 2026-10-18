/** Great-circle helpers shared by the city list, the compass and birth-zone lookup. */

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
export const EARTH_KM = 6371;

export interface LatLon {
  lat: number;
  lon: number;
}

/** Great-circle distance in km. */
export function distanceKm(a: LatLon, b: LatLon): number {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dp = p2 - p1;
  const dl = (b.lon - a.lon) * DEG;
  const s = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Initial great-circle bearing from a to b, degrees clockwise from north, 0–360. */
export function bearingDeg(a: LatLon, b: LatLon): number {
  const p1 = a.lat * DEG;
  const p2 = b.lat * DEG;
  const dl = (b.lon - a.lon) * DEG;
  const y = Math.sin(dl) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
  return (((Math.atan2(y, x) * RAD) % 360) + 360) % 360;
}
