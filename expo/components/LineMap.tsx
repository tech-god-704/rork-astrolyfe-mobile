import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/colors';
import { CITIES } from '@/data/cities';
import { mapLines, type BirthMoment, type MapLines, type PlaceHit, type PlacePlanet } from '@/services/places';
import { BOTTOM_LAT, HEIGHT, TOP_LAT, pickLabels, segmentPath, x, y } from '@/lib/lineMapLayout';

/**
 * One planet's four lines across the world, on an equirectangular map.
 *
 * Drawn in degree units via the viewBox — x is longitude + 180, y is 75 − latitude —
 * so there is no layout measuring and the SVG scales to whatever width it is given.
 * There are no coastlines on purpose: the city dots trace the continents, and the
 * lines are the point.
 */

const GRID_LONS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRID_LATS = [60, 30, 0, -30];

interface Props {
  birth: BirthMoment;
  planet: PlacePlanet;
  color: string;
  /** The cities to highlight; the first three are labelled. */
  hits: PlaceHit[];
  /** Colour for the highlighted city dots; defaults to `color`. */
  hitColor?: string;
  /** A second person's lines for the same planet, drawn beneath the first. */
  partner?: { birth: BirthMoment; color: string; label: string };
}

/** One person's four lines for one planet. */
function PlanetLayer({ geometry, color, id }: { geometry: MapLines; color: string; id: string }) {
  return (
    <>
      <Line x1={x(geometry.mc)} y1={0} x2={x(geometry.mc)} y2={HEIGHT} stroke={color} strokeWidth={0.9} />
      <Line x1={x(geometry.ic)} y1={0} x2={x(geometry.ic)} y2={HEIGHT} stroke={color} strokeWidth={0.9} strokeDasharray="3,2" opacity={0.85} />
      {[...geometry.asc, ...geometry.dsc].map((seg, i) => (
        <Path key={`${id}-h${i}`} d={segmentPath(seg)} stroke={color} strokeWidth={0.8} strokeDasharray="0.8,1.4" strokeLinecap="round" fill="none" />
      ))}
    </>
  );
}

export default function LineMap({ birth, planet, color, hits, hitColor, partner }: Props) {
  const geometry = useMemo(() => mapLines(birth, planet, BOTTOM_LAT, TOP_LAT), [birth, planet]);
  const partnerGeometry = useMemo(
    () => (partner ? mapLines(partner.birth, planet, BOTTOM_LAT, TOP_LAT) : null),
    [partner, planet],
  );

  const labelled = useMemo(() => pickLabels(hits), [hits]);
  const a11y = `Map of your${partner ? ` and ${partner.label}'s` : ''} ${planet} lines${hits.length ? `, passing near ${hits.slice(0, 3).map((h) => h.city.name).join(', ')}` : ''}.`;

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

        {partner && partnerGeometry && <PlanetLayer geometry={partnerGeometry} color={partner.color} id="partner" />}
        <PlanetLayer geometry={geometry} color={color} id="self" />

        {hits.map((hit) => (
          <Circle key={`hit-${hit.city.name}`} cx={x(hit.city.lon)} cy={y(hit.city.lat)} r={2.1} fill={hitColor ?? color} stroke={Colors.bg} strokeWidth={0.5} />
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

      {partner && (
        <View style={styles.legend}>
          <LegendItem label="You" color={color} kind="solid" />
          <LegendItem label={partner.label} color={partner.color} kind="solid" />
        </View>
      )}
      <View style={styles.legend}>
        <LegendItem label="Midheaven" color={color} kind="solid" />
        <LegendItem label="Home line" color={color} kind="dashed" />
        <LegendItem label="Rising & partner" color={color} kind="dotted" />
      </View>
    </View>
  );
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
