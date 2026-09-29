import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/colors';
import { CITIES } from '@/data/cities';
import { mapLines, type BirthMoment, type PlaceHit, type PlacePlanet } from '@/services/places';

/**
 * One planet's four lines across the world, on an equirectangular map.
 *
 * Drawn in degree units via the viewBox — x is longitude + 180, y is 75 − latitude —
 * so there is no layout measuring and the SVG scales to whatever width it is given.
 * There are no coastlines on purpose: the city dots trace the continents, and the
 * lines are the point.
 */

const TOP_LAT = 75;
const BOTTOM_LAT = -60;
const HEIGHT = TOP_LAT - BOTTOM_LAT; // 135
const x = (lon: number) => lon + 180;
const y = (lat: number) => TOP_LAT - lat;

const GRID_LONS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRID_LATS = [60, 30, 0, -30];

interface Props {
  birth: BirthMoment;
  planet: PlacePlanet;
  color: string;
  /** The cities to highlight; the first three are labelled. */
  hits: PlaceHit[];
}

export default function LineMap({ birth, planet, color, hits }: Props) {
  const geometry = useMemo(() => mapLines(birth, planet, BOTTOM_LAT, TOP_LAT), [birth, planet]);

  const segmentPath = (seg: [number, number][]) =>
    seg.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${x(lon).toFixed(2)} ${y(lat).toFixed(2)}`).join(' ');

  const labelled = useMemo(() => pickLabels(hits), [hits]);
  const a11y = `Map of your ${planet} lines${hits.length ? `, passing near ${hits.slice(0, 3).map((h) => h.city.name).join(', ')}` : ''}.`;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={a11y}>
      <View style={styles.mapBox}>
      <Svg width="100%" height="100%" viewBox={`0 0 360 ${HEIGHT}`}>
        <Rect x={0} y={0} width={360} height={HEIGHT} fill="rgba(9,5,27,0.9)" />

        {GRID_LONS.map((lon) => (
          <Line key={`lon${lon}`} x1={x(lon)} y1={0} x2={x(lon)} y2={HEIGHT} stroke="rgba(218,200,242,0.07)" strokeWidth={0.3} />
        ))}
        {GRID_LATS.map((lat) => (
          <Line
            key={`lat${lat}`}
            x1={0}
            y1={y(lat)}
            x2={360}
            y2={y(lat)}
            stroke={lat === 0 ? 'rgba(218,200,242,0.16)' : 'rgba(218,200,242,0.07)'}
            strokeWidth={0.3}
          />
        ))}

        {CITIES.map((c) => (
          <Circle key={c.name} cx={x(c.lon)} cy={y(c.lat)} r={0.9} fill="rgba(237,228,253,0.38)" />
        ))}

        <Line x1={x(geometry.mc)} y1={0} x2={x(geometry.mc)} y2={HEIGHT} stroke={color} strokeWidth={0.9} />
        <Line x1={x(geometry.ic)} y1={0} x2={x(geometry.ic)} y2={HEIGHT} stroke={color} strokeWidth={0.9} strokeDasharray="3,2" opacity={0.85} />
        {[...geometry.asc, ...geometry.dsc].map((seg, i) => (
          <Path key={`h${i}`} d={segmentPath(seg)} stroke={color} strokeWidth={0.8} strokeDasharray="0.8,1.4" strokeLinecap="round" fill="none" />
        ))}

        {hits.map((hit) => (
          <Circle key={`hit-${hit.city.name}`} cx={x(hit.city.lon)} cy={y(hit.city.lat)} r={2.1} fill={color} stroke={Colors.bg} strokeWidth={0.5} />
        ))}
        {labelled.map(({ hit, lx, ly }) => {
          return (
            <SvgText
              key={`label-${hit.city.name}`}
              x={lx}
              y={ly}
              fill={Colors.textPrimary}
              fontSize={5.4}
              fontWeight="700"
              textAnchor="middle"
            >
              {hit.city.name}
            </SvgText>
          );
        })}
      </Svg>
      </View>

      <View style={styles.legend}>
        <LegendItem label="Midheaven" color={color} kind="solid" />
        <LegendItem label="Home line" color={color} kind="dashed" />
        <LegendItem label="Rising & partner" color={color} kind="dotted" />
      </View>
    </View>
  );
}

/** Where a city's label sits: clamped off the side edges, below the dot near the top. */
function labelPosition(hit: PlaceHit): { lx: number; ly: number } {
  const cy = y(hit.city.lat);
  return { lx: Math.min(Math.max(x(hit.city.lon), 22), 338), ly: cy < 12 ? cy + 7.5 : cy - 4 };
}

/** Approximate rendered width at fontSize 5.4 bold — ~0.55em per character. */
const labelWidth = (hit: PlaceHit) => hit.city.name.length * 3;

/**
 * Up to three labels, closest city first, skipping any that would overprint one
 * already placed. Nearby cities (Zurich and Milan are 3° apart) otherwise stack
 * their names into an unreadable smear; the skipped city still gets its dot.
 */
function pickLabels(hits: PlaceHit[]): { hit: PlaceHit; lx: number; ly: number }[] {
  const placed: { hit: PlaceHit; lx: number; ly: number }[] = [];
  for (const hit of hits) {
    const pos = labelPosition(hit);
    const clashes = placed.some(
      (p) =>
        Math.abs(p.lx - pos.lx) < (labelWidth(p.hit) + labelWidth(hit)) / 2 + 2 &&
        Math.abs(p.ly - pos.ly) < 7,
    );
    if (!clashes) placed.push({ hit, ...pos });
    if (placed.length === 3) break;
  }
  return placed;
}

function LegendItem({ label, color, kind }: { label: string; color: string; kind: 'solid' | 'dashed' | 'dotted' }) {
  return (
    <View style={styles.legendItem}>
      <Svg width={18} height={6}>
        <Line
          x1={1}
          y1={3}
          x2={17}
          y2={3}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={kind === 'solid' ? undefined : kind === 'dashed' ? '5,3' : '1,3'}
        />
      </Svg>
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  // A definite size for the SVG to fill — height="100%" of an unsized parent collapses to 0.
  mapBox: { width: '100%', aspectRatio: 360 / HEIGHT, borderRadius: 16, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 10, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
});
