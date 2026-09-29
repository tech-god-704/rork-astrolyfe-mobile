/**
 * Pure layout for LineMap: projection, stroke paths and label placement.
 *
 * Kept free of React Native imports so it can be exercised — and rendered to an image
 * for visual checks — outside the app, using exactly the code that ships.
 */

import type { PlaceHit } from '@/services/places';

export const TOP_LAT = 75;
export const BOTTOM_LAT = -60;
export const HEIGHT = TOP_LAT - BOTTOM_LAT; // 135
export const x = (lon: number) => lon + 180;
export const y = (lat: number) => TOP_LAT - lat;

export const segmentPath = (seg: [number, number][]) =>
  seg.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${x(lon).toFixed(2)} ${y(lat).toFixed(2)}`).join(' ');

/**
 * Sizes in viewBox units. The map is 360 units wide and renders ~350 px wide on a
 * phone, so one unit is about one pixel. The first version used 5.4-unit labels
 * because it was only ever checked in 3× renders, where they looked fine; at real
 * phone width they were ~5 px and unreadable.
 */
export const LABEL_SIZE = 10;
export const HIT_RADIUS = 3.2;

/** Approximate rendered width of a bold label — ~0.56em per character. */
export const labelWidth = (hit: PlaceHit) => hit.city.name.length * LABEL_SIZE * 0.56;

export interface PlacedLabel { hit: PlaceHit; lx: number; ly: number }

/**
 * Up to three labels, closest city first. Each tries above its dot, then below
 * (below first near the top edge), and is skipped only if both would overprint an
 * already placed label or another highlighted dot, or run off the map. Nearby
 * cities (Zurich and Milan are 3° apart) otherwise smear their names together. A
 * skipped city still gets its dot.
 */
export function pickLabels(hits: PlaceHit[]): PlacedLabel[] {
  const placed: PlacedLabel[] = [];

  // Text box around the baseline: cap height above, a little descent below.
  const boxOf = (hit: PlaceHit, lx: number, ly: number) => {
    const half = labelWidth(hit) / 2;
    return { left: lx - half - 1, right: lx + half + 1, top: ly - LABEL_SIZE * 0.8, bottom: ly + LABEL_SIZE * 0.25 };
  };
  const overlaps = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  const collides = (hit: PlaceHit, lx: number, ly: number) => {
    const box = boxOf(hit, lx, ly);
    if (box.top < 1 || box.bottom > HEIGHT - 1) return true;
    if (placed.some((p) => overlaps(box, boxOf(p.hit, p.lx, p.ly)))) return true;
    return hits.some((other) => {
      if (other === hit) return false;
      const cx = x(other.city.lon);
      const cy = y(other.city.lat);
      return overlaps(box, { left: cx - HIT_RADIUS, right: cx + HIT_RADIUS, top: cy - HIT_RADIUS, bottom: cy + HIT_RADIUS });
    });
  };

  for (const hit of hits) {
    const half = labelWidth(hit) / 2;
    // Keep the whole label on the map, not just its centre.
    const lx = Math.min(Math.max(x(hit.city.lon), half + 2), 360 - half - 2);
    const cy = y(hit.city.lat);
    const above = cy - HIT_RADIUS - 3;
    const below = cy + HIT_RADIUS + LABEL_SIZE * 0.8 + 2;
    const tries = cy < LABEL_SIZE + 6 ? [below, above] : [above, below];
    const ly = tries.find((candidate) => !collides(hit, lx, candidate));
    if (ly !== undefined) placed.push({ hit, lx, ly });
    if (placed.length === 3) break;
  }
  return placed;
}
