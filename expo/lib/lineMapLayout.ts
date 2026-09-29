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

/** Approximate rendered width at fontSize 5.4 bold — ~0.55em per character. */
const labelWidth = (hit: PlaceHit) => hit.city.name.length * 3;

export interface PlacedLabel { hit: PlaceHit; lx: number; ly: number }

/**
 * Up to three labels, closest city first. Each tries above its dot, then below
 * (below first near the top edge), and is skipped only if both would overprint an
 * already placed label or another highlighted dot. Nearby cities (Zurich and Milan
 * are 3° apart; the Couple Map's European cluster is tighter still) otherwise smear
 * their names together. A skipped city still gets its dot.
 */
export function pickLabels(hits: PlaceHit[]): PlacedLabel[] {
  const placed: PlacedLabel[] = [];

  const collides = (hit: PlaceHit, lx: number, ly: number) => {
    const half = labelWidth(hit) / 2;
    // Text box: baseline at ly, cap height ~5 above it.
    const box = { left: lx - half - 1, right: lx + half + 1, top: ly - 5.5, bottom: ly + 1.5 };
    const overLabel = placed.some(
      (p) => Math.abs(p.lx - lx) < (labelWidth(p.hit) + labelWidth(hit)) / 2 + 2 && Math.abs(p.ly - ly) < 7,
    );
    const overDot = hits.some((other) => {
      if (other === hit) return false;
      const cx = x(other.city.lon);
      const cy = y(other.city.lat);
      return cx + 2.1 > box.left && cx - 2.1 < box.right && cy + 2.1 > box.top && cy - 2.1 < box.bottom;
    });
    return overLabel || overDot;
  };

  for (const hit of hits) {
    const cy = y(hit.city.lat);
    const lx = Math.min(Math.max(x(hit.city.lon), 22), 338);
    const above = cy - 4;
    const below = cy + 7.5;
    const tries = cy < 12 ? [below, above] : [above, below];
    const ly = tries.find((candidate) => candidate > 5 && candidate < HEIGHT - 1 && !collides(hit, lx, candidate));
    if (ly !== undefined) placed.push({ hit, lx, ly });
    if (placed.length === 3) break;
  }
  return placed;
}

