import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { calculateNatalChart, getInterpretation, type NatalPlanet } from '@/services/natal';

const CHART_SIZE = 320;
const CENTER = CHART_SIZE / 2;
const OUTER_R = 148;
const INNER_R = 108;
const SIGN_R = 128;
const PLANET_R = 82;

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const PLANET_COLORS: Record<string, string> = {
  Sun: Colors.gold, Moon: '#C4B5FD', Mercury: Colors.teal, Venus: Colors.accent,
  Mars: '#EF4444', Jupiter: '#F97316', Saturn: '#6B7280', Uranus: '#06B6D4',
  Neptune: '#818CF8', Pluto: '#A855F7',
};

export default function ChartScreen() {
  const { profile } = useAuth();
  const userSign = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;
  const [expandedPlanet, setExpandedPlanet] = useState<string | null>(null);

  // Calculate natal chart locally — no API, no loading, instant
  const chart = useMemo(() => {
    if (!profile?.birth_date) return null;
    const parts = profile.birth_date.split('-');
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

    return calculateNatalChart({
      year,
      month,
      day,
      latitude: profile.birth_lat ?? undefined,
      longitude: profile.birth_lon ?? undefined,
    });
  }, [profile?.birth_date, profile?.birth_lat, profile?.birth_lon]);

  const planets = chart?.planets ?? [];

  const togglePlanet = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedPlanet((prev) => (prev === name ? null : name));
  };

  // Spread planets that are close together on the wheel so symbols don't overlap
  const spreadPlanetAngles = useMemo(() => {
    if (planets.length === 0) return {};
    const angles: { name: string; raw: number; display: number }[] = planets.map((p) => ({
      name: p.name,
      raw: p.fullDegree,
      display: p.fullDegree,
    }));
    angles.sort((a, b) => a.raw - b.raw);

    const MIN_GAP = 10; // minimum degrees between planet markers
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < angles.length; i++) {
        const next = angles[(i + 1) % angles.length];
        let gap = next.display - angles[i].display;
        if (gap < 0) gap += 360;
        if (gap < MIN_GAP && gap > 0) {
          const shift = (MIN_GAP - gap) / 2;
          angles[i].display -= shift;
          next.display += shift;
        }
      }
    }

    const map: Record<string, number> = {};
    for (const a of angles) map[a.name] = a.display;
    return map;
  }, [planets]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Natal Chart</Text>
          <View style={styles.subtitleRow}>
            {userSign && <Text style={styles.signSymbol}>{userSign.symbol}</Text>}
            <Text style={styles.subtitle}>
              {chart
                ? userSign?.name ?? 'Your Birth Chart'
                : 'Add your birth date in Profile to see your chart'}
            </Text>
            {chart?.ascendantSign && (
              <View style={styles.ascBadge}>
                <Text style={styles.ascText}>ASC {chart.ascendantSign}</Text>
              </View>
            )}
          </View>

          {/* SVG Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartGlow} />
            <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
              <Defs>
                <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={Colors.purple} stopOpacity={0.15} />
                  <Stop offset="100%" stopColor={Colors.purple} stopOpacity={0} />
                </RadialGradient>
              </Defs>

              <Circle cx={CENTER} cy={CENTER} r={60} fill="url(#centerGlow)" />
              <Circle cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke="rgba(167,139,250,0.25)" strokeWidth={1.5} />
              <Circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth={1} />
              <Circle cx={CENTER} cy={CENTER} r={60} fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth={0.5} />

              {/* Zodiac sign segments */}
              {ZODIAC_SIGNS.map((sign, i) => {
                const angle = (i * 30 - 90) * DEG;
                const midAngle = (i * 30 + 15 - 90) * DEG;
                const x1 = CENTER + Math.cos(angle) * INNER_R;
                const y1 = CENTER + Math.sin(angle) * INNER_R;
                const x2 = CENTER + Math.cos(angle) * OUTER_R;
                const y2 = CENTER + Math.sin(angle) * OUTER_R;
                const sx = CENTER + Math.cos(midAngle) * SIGN_R;
                const sy = CENTER + Math.sin(midAngle) * SIGN_R;
                const isUser = userSign?.name === sign.name;
                return (
                  <G key={sign.name}>
                    <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(167,139,250,0.15)" strokeWidth={0.5} />
                    <SvgText
                      x={sx} y={sy}
                      fill={isUser ? sign.color : 'rgba(255,255,255,0.45)'}
                      fontSize={isUser ? 18 : 14}
                      fontWeight={isUser ? 'bold' : 'normal'}
                      textAnchor="middle"
                      alignmentBaseline="central"
                    >
                      {sign.symbol}
                    </SvgText>
                  </G>
                );
              })}

              {/* House lines */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
                const a = (deg - 90) * DEG;
                return (
                  <Line
                    key={deg}
                    x1={CENTER} y1={CENTER}
                    x2={CENTER + Math.cos(a) * 58}
                    y2={CENTER + Math.sin(a) * 58}
                    stroke={deg % 90 === 0 ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.08)'}
                    strokeWidth={deg % 90 === 0 ? 1 : 0.5}
                  />
                );
              })}

              {/* Ascendant marker */}
              {chart?.ascendant != null && (
                <G>
                  <Line
                    x1={CENTER + Math.cos((chart.ascendant - 90) * DEG) * 60}
                    y1={CENTER + Math.sin((chart.ascendant - 90) * DEG) * 60}
                    x2={CENTER + Math.cos((chart.ascendant - 90) * DEG) * OUTER_R}
                    y2={CENTER + Math.sin((chart.ascendant - 90) * DEG) * OUTER_R}
                    stroke={Colors.gold}
                    strokeWidth={1.5}
                    strokeDasharray="4,3"
                  />
                  <SvgText
                    x={CENTER + Math.cos((chart.ascendant - 90) * DEG) * (OUTER_R + 12)}
                    y={CENTER + Math.sin((chart.ascendant - 90) * DEG) * (OUTER_R + 12)}
                    fill={Colors.gold}
                    fontSize={9}
                    fontWeight="bold"
                    textAnchor="middle"
                    alignmentBaseline="central"
                  >
                    ASC
                  </SvgText>
                </G>
              )}

              {/* Planet markers on the wheel */}
              {planets.map((p) => {
                const displayAngle = spreadPlanetAngles[p.name] ?? p.fullDegree;
                const a = (displayAngle - 90) * DEG;
                const px = CENTER + Math.cos(a) * PLANET_R;
                const py = CENTER + Math.sin(a) * PLANET_R;
                const color = PLANET_COLORS[p.name] ?? Colors.purpleLight;
                return (
                  <G key={`marker-${p.name}`}>
                    <Circle cx={px} cy={py} r={10} fill={`${color}25`} />
                    <SvgText
                      x={px} y={py}
                      fill={color}
                      fontSize={13}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="central"
                    >
                      {PLANET_SYMBOLS[p.name] ?? ''}
                    </SvgText>
                  </G>
                );
              })}

              {/* Center dot */}
              <Circle cx={CENTER} cy={CENTER} r={5} fill={Colors.gold} />
              <Circle cx={CENTER} cy={CENTER} r={3} fill={Colors.goldLight} />
            </Svg>
          </View>

          {/* Planetary Positions */}
          {planets.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Planetary Positions</Text>
              {planets.map((p) => {
                const color = PLANET_COLORS[p.name] ?? Colors.purpleLight;
                const isExpanded = expandedPlanet === p.name;
                return (
                  <Pressable key={p.name} onPress={() => togglePlanet(p.name)}>
                    <GlassCard style={[styles.planetRow, isExpanded && { borderColor: `${color}30` }]}>
                      <View style={[styles.planetIconCircle, { backgroundColor: `${color}18` }]}>
                        <Text style={[styles.planetSymbol, { color }]}>{PLANET_SYMBOLS[p.name] ?? ''}</Text>
                      </View>
                      <View style={styles.planetInfo}>
                        <Text style={styles.planetName}>{p.name}</Text>
                        <Text style={styles.planetSign}>
                          {p.sign} {p.normDegree.toFixed(0)}°
                          {p.isRetro === 'true' ? '  ℞' : ''}
                        </Text>
                      </View>
                      <View style={styles.planetMeta}>
                        <Text style={styles.planetHouse}>{ordinal(p.house)} House</Text>
                        {isExpanded
                          ? <ChevronUp size={14} color={Colors.textMuted} />
                          : <ChevronDown size={14} color={Colors.textMuted} />}
                      </View>
                    </GlassCard>
                    {isExpanded && (
                      <GlassCard variant="subtle" style={styles.interpretCard}>
                        <View style={[styles.interpretAccent, { backgroundColor: color }]} />
                        <Text style={styles.interpretText}>
                          {getInterpretation(p.name, p.sign)}
                        </Text>
                        <Text style={styles.interpretDetail}>
                          Ruled by {p.signLord} · {p.normDegree.toFixed(1)}° {p.sign}
                          {p.isRetro === 'true' ? ' · Retrograde' : ''}
                        </Text>
                      </GlassCard>
                    )}
                  </Pressable>
                );
              })}
            </>
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Set Your Birth Date</Text>
              <Text style={styles.emptyDesc}>
                Add your birth date in your Profile to see your personalized natal chart with all planetary positions.
              </Text>
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, letterSpacing: -0.5 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 24, flexWrap: 'wrap' },
  signSymbol: { fontSize: 20 },
  subtitle: { fontSize: 16, color: Colors.purpleLight, fontWeight: '600' },
  ascBadge: { backgroundColor: Colors.goldDim, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  ascText: { fontSize: 11, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },

  chartContainer: {
    width: CHART_SIZE,
    height: CHART_SIZE,
    marginBottom: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartGlow: {
    position: 'absolute',
    width: CHART_SIZE + 40,
    height: CHART_SIZE + 40,
    borderRadius: (CHART_SIZE + 40) / 2,
    backgroundColor: 'rgba(124,58,237,0.06)',
  },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.3 },

  planetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  planetIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  planetSymbol: { fontSize: 22 },
  planetInfo: { flex: 1 },
  planetName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  planetSign: { fontSize: 13, color: Colors.purpleLight, marginTop: 2 },
  planetMeta: { alignItems: 'flex-end', gap: 4 },
  planetHouse: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  interpretCard: {
    marginBottom: 10,
    marginLeft: 20,
    overflow: 'hidden',
  },
  interpretAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  interpretText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, paddingLeft: 6 },
  interpretDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 8, paddingLeft: 6 },

  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 10 },
});
