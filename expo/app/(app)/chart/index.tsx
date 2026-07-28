import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { ChevronDown, ChevronUp, Flame, Droplets, Wind, Mountain, Zap, Anchor, Shuffle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { calculateNatalChart, getInterpretation } from '@/services/natal';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';

const DEG = Math.PI / 180;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_SIZE = Math.min(320, SCREEN_WIDTH - 40);
const CENTER = CHART_SIZE / 2;
const SCALE = CHART_SIZE / 320;
const OUTER_R = Math.round(148 * SCALE);
const INNER_R = Math.round(108 * SCALE);
const SIGN_R = Math.round(128 * SCALE);
const PLANET_R = Math.round(82 * SCALE);

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

const PLANET_COLORS: Record<string, string> = {
  Sun: Colors.gold, Moon: '#C4B5FD', Mercury: Colors.teal, Venus: Colors.accent,
  Mars: '#FF647C', Jupiter: '#D994F2', Saturn: '#8F89A2', Uranus: '#6FB2FA',
  Neptune: '#818CF8', Pluto: '#A855F7',
};

const ASPECT_STYLES: Record<string, { color: string; dash: string; label: string; symbol: string }> = {
  conjunction: { color: Colors.gold, dash: '', label: 'Conjunction', symbol: '☌' },
  sextile: { color: Colors.teal, dash: '4,4', label: 'Sextile', symbol: '⚹' },
  square: { color: '#EF4444', dash: '2,3', label: 'Square', symbol: '□' },
  trine: { color: '#22C55E', dash: '', label: 'Trine', symbol: '△' },
  opposition: { color: Colors.accent, dash: '6,3', label: 'Opposition', symbol: '☍' },
};

const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#EF4444', Earth: '#22C55E', Air: '#06B6D4', Water: '#818CF8',
};

const ELEMENT_ICONS: Record<string, typeof Flame> = {
  Fire: Flame, Earth: Mountain, Air: Wind, Water: Droplets,
};

const MODALITY_ICONS: Record<string, typeof Zap> = {
  Cardinal: Zap, Fixed: Anchor, Mutable: Shuffle,
};

const ASPECT_MEANINGS: Record<string, string> = {
  conjunction: 'Intensifies and merges the energies of both planets — a powerful fusion',
  sextile: 'A harmonious flow of opportunity — these planets support each other naturally',
  square: 'Dynamic tension that drives growth — challenges that push you to evolve',
  trine: 'Effortless harmony — these planets work together with natural grace',
  opposition: 'A balancing act between two poles — integration brings wholeness',
};

export default function ChartScreen() {
  const styles = useThemedStyles(createStyles);
  const { profile } = useAuth();
  const userSign = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;
  const [expandedPlanet, setExpandedPlanet] = useState<string | null>(null);
  const [showAspects, setShowAspects] = useState(true);
  const [expandedAspect, setExpandedAspect] = useState<number | null>(null);

  const chart = useMemo(() => {
    try {
      if (!profile?.birth_date) return null;
      const parts = profile.birth_date.split('-');
      if (parts.length !== 3) return null;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
      if (month < 1 || month > 12 || day < 1 || day > 31) return null;

      const qd = profile.quiz_data;
      const hour = qd?.birth_hour ?? undefined;
      const minute = qd?.birth_minute ?? undefined;

      return calculateNatalChart({
        year, month, day, hour, minute,
        latitude: profile.birth_lat ?? undefined,
        longitude: profile.birth_lon ?? undefined,
      });
    } catch {
      return null;
    }
  }, [profile?.birth_date, profile?.birth_lat, profile?.birth_lon, profile?.quiz_data]);

  const planets = useMemo(() => chart?.planets ?? [], [chart?.planets]);
  const hasExactBirthTime = profile?.quiz_data?.birth_hour != null;

  const togglePlanet = (name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedPlanet((prev) => (prev === name ? null : name));
  };

  const toggleAspect = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedAspect((prev) => (prev === idx ? null : idx));
  };

  // Spread planets that are close together
  const spreadPlanetAngles = useMemo(() => {
    if (planets.length === 0) return {};
    const angles: { name: string; raw: number; display: number }[] = planets.map((p) => ({
      name: p.name, raw: p.fullDegree, display: p.fullDegree,
    }));
    angles.sort((a, b) => a.raw - b.raw);

    const MIN_GAP = 10;
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

  // Major aspects for display (limit to tightest orbs)
  const majorAspects = useMemo(() => {
    if (!chart?.aspects) return [];
    return chart.aspects
      .slice()
      .sort((a, b) => a.orb - b.orb)
      .slice(0, 15);
  }, [chart?.aspects]);

  // Aspect counts by type
  const aspectCounts = useMemo(() => {
    if (!chart?.aspects) return {};
    const counts: Record<string, number> = {};
    for (const a of chart.aspects) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return counts;
  }, [chart?.aspects]);

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>YOUR BIRTH CHART</Text>
          <Text style={styles.title}>Your cosmic blueprint</Text>
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

          {chart && !hasExactBirthTime && (
            <View style={styles.approxBadge}>
              <Text style={styles.approxText}>ESTIMATED · Add your birth time to sharpen houses and angles.</Text>
            </View>
          )}

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

              <Circle cx={CENTER} cy={CENTER} r={Math.round(60 * SCALE)} fill="url(#centerGlow)" />
              <Circle cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke="rgba(192,154,235,0.48)" strokeWidth={1.5} />
              <Circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="rgba(218,200,242,0.20)" strokeWidth={1} />
              <Circle cx={CENTER} cy={CENTER} r={Math.round(60 * SCALE)} fill="none" stroke="rgba(97,56,163,0.24)" strokeWidth={0.5} />

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
                    <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(218,200,242,0.16)" strokeWidth={0.5} />
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
                    x2={CENTER + Math.cos(a) * Math.round(58 * SCALE)}
                    y2={CENTER + Math.sin(a) * Math.round(58 * SCALE)}
                    stroke={deg % 90 === 0 ? 'rgba(150,98,198,0.38)' : 'rgba(218,200,242,0.09)'}
                    strokeWidth={deg % 90 === 0 ? 1 : 0.5}
                  />
                );
              })}

              {/* Aspect lines between planets */}
              {showAspects && majorAspects.map((asp, i) => {
                const a1deg = spreadPlanetAngles[asp.planet1] ?? planets.find(p => p.name === asp.planet1)?.fullDegree ?? 0;
                const a2deg = spreadPlanetAngles[asp.planet2] ?? planets.find(p => p.name === asp.planet2)?.fullDegree ?? 0;
                const a1 = (a1deg - 90) * DEG;
                const a2 = (a2deg - 90) * DEG;
                const lineR = Math.round(58 * SCALE);
                const style = ASPECT_STYLES[asp.type];
                const opacity = Math.max(0.15, 0.5 - asp.orb * 0.05);
                return (
                  <Line
                    key={`asp-${i}`}
                    x1={CENTER + Math.cos(a1) * lineR}
                    y1={CENTER + Math.sin(a1) * lineR}
                    x2={CENTER + Math.cos(a2) * lineR}
                    y2={CENTER + Math.sin(a2) * lineR}
                    stroke={style.color}
                    strokeWidth={asp.orb < 2 ? 1.5 : 0.8}
                    strokeDasharray={style.dash}
                    opacity={opacity}
                  />
                );
              })}

              {/* Ascendant marker */}
              {chart?.ascendant != null && (
                <G>
                  <Line
                    x1={CENTER + Math.cos((chart.ascendant - 90) * DEG) * Math.round(60 * SCALE)}
                    y1={CENTER + Math.sin((chart.ascendant - 90) * DEG) * Math.round(60 * SCALE)}
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

              {/* Planet markers */}
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
              <Circle cx={CENTER} cy={CENTER} r={Math.round(5 * SCALE)} fill={Colors.gold} />
              <Circle cx={CENTER} cy={CENTER} r={Math.round(3 * SCALE)} fill={Colors.goldLight} />
            </Svg>
          </View>

          {/* Aspect toggle */}
          {chart && majorAspects.length > 0 && (
            <Pressable
              style={styles.aspectToggle}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setShowAspects((v) => !v);
              }}
              hitSlop={8}
              accessibilityRole="switch"
              accessibilityState={{ checked: showAspects }}
              accessibilityLabel="Toggle aspect lines on chart"
            >
              <Text style={[styles.aspectToggleText, showAspects && { color: Colors.purpleLight }]}>
                {showAspects ? 'Hide' : 'Show'} Aspect Lines
              </Text>
            </Pressable>
          )}

          {planets.length > 0 ? (
            <>
              {/* Element & Modality Distribution */}
              {chart && (
                <GlassCard variant="glow" glowColor={ELEMENT_COLORS[chart.elements.dominant]} style={styles.distributionCard}>
                  <Text style={styles.distributionTitle}>Chart Signature</Text>

                  {/* Element bars */}
                  <View style={styles.distSection}>
                    <Text style={styles.distLabel}>Elements</Text>
                    <View style={styles.distBars}>
                      {(['Fire', 'Earth', 'Air', 'Water'] as const).map((el) => {
                        const count = chart.elements[el].length;
                        const pct = (count / 10) * 100;
                        const Icon = ELEMENT_ICONS[el];
                        const isDominant = el === chart.elements.dominant;
                        return (
                          <View key={el} style={styles.distBarRow}>
                            <View style={styles.distBarLabel}>
                              <Icon size={14} color={ELEMENT_COLORS[el]} />
                              <Text style={[styles.distBarName, isDominant && { color: Colors.textPrimary, fontWeight: '700' }]}>
                                {el}
                              </Text>
                            </View>
                            <View style={styles.distBarTrack}>
                              <View style={[styles.distBarFill, { width: `${pct}%`, backgroundColor: ELEMENT_COLORS[el] }]} />
                            </View>
                            <Text style={[styles.distBarCount, { color: ELEMENT_COLORS[el] }]}>{count}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Modality bars */}
                  <View style={[styles.distSection, { marginTop: 16 }]}>
                    <Text style={styles.distLabel}>Modalities</Text>
                    <View style={styles.distBars}>
                      {(['Cardinal', 'Fixed', 'Mutable'] as const).map((mod) => {
                        const count = chart.modalities[mod].length;
                        const pct = (count / 10) * 100;
                        const Icon = MODALITY_ICONS[mod];
                        const isDominant = mod === chart.modalities.dominant;
                        const color = mod === 'Cardinal' ? Colors.accent : mod === 'Fixed' ? Colors.gold : Colors.teal;
                        return (
                          <View key={mod} style={styles.distBarRow}>
                            <View style={styles.distBarLabel}>
                              <Icon size={14} color={color} />
                              <Text style={[styles.distBarName, isDominant && { color: Colors.textPrimary, fontWeight: '700' }]}>
                                {mod}
                              </Text>
                            </View>
                            <View style={styles.distBarTrack}>
                              <View style={[styles.distBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                            </View>
                            <Text style={[styles.distBarCount, { color }]}>{count}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Dominant summary */}
                  <View style={styles.dominantRow}>
                    <Text style={styles.dominantText}>
                      Dominant {chart.elements.dominant} · {chart.modalities.dominant} emphasis
                    </Text>
                  </View>
                </GlassCard>
              )}

              {/* Aspect Legend */}
              {chart && chart.aspects.length > 0 && (
                <View style={styles.aspectLegend}>
                  {Object.entries(aspectCounts).map(([type, count]) => {
                    const style = ASPECT_STYLES[type];
                    return (
                      <View key={type} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: style.color }]} />
                        <Text style={styles.legendLabel}>{style.symbol} {count}</Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Planetary Positions */}
              <Text style={styles.sectionTitle}>Planetary Positions</Text>
              {planets.map((p) => {
                const color = PLANET_COLORS[p.name] ?? Colors.purpleLight;
                const isExpanded = expandedPlanet === p.name;
                return (
                  <Pressable
                    key={p.name}
                    onPress={() => togglePlanet(p.name)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.name} in ${p.sign}, ${ordinal(p.house)} house`}
                    accessibilityState={{ expanded: isExpanded }}
                  >
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

              {/* Aspects List */}
              {chart && majorAspects.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Aspects</Text>
                  {majorAspects.map((asp, i) => {
                    const style = ASPECT_STYLES[asp.type];
                    const isExpanded = expandedAspect === i;
                    const c1 = PLANET_COLORS[asp.planet1] ?? Colors.purpleLight;
                    const c2 = PLANET_COLORS[asp.planet2] ?? Colors.purpleLight;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => toggleAspect(i)}
                        accessibilityRole="button"
                        accessibilityLabel={`${asp.planet1} ${style.label} ${asp.planet2}`}
                        accessibilityState={{ expanded: isExpanded }}
                      >
                        <GlassCard style={[styles.aspectRow, isExpanded && { borderColor: `${style.color}30` }]}>
                          <View style={styles.aspectPlanets}>
                            <Text style={[styles.aspectPlanetSymbol, { color: c1 }]}>
                              {PLANET_SYMBOLS[asp.planet1]}
                            </Text>
                            <Text style={[styles.aspectTypeSymbol, { color: style.color }]}>
                              {style.symbol}
                            </Text>
                            <Text style={[styles.aspectPlanetSymbol, { color: c2 }]}>
                              {PLANET_SYMBOLS[asp.planet2]}
                            </Text>
                          </View>
                          <View style={styles.aspectInfo}>
                            <Text style={styles.aspectLabel}>
                              {asp.planet1} {style.label} {asp.planet2}
                            </Text>
                            <Text style={styles.aspectOrb}>
                              {asp.angle.toFixed(1)}° · Orb {asp.orb.toFixed(1)}°
                              {asp.applying ? ' · Applying' : ''}
                            </Text>
                          </View>
                          <View style={[styles.aspectOrbDot, { backgroundColor: `${style.color}20` }]}>
                            <View style={[styles.aspectOrbInner, {
                              backgroundColor: style.color,
                              width: Math.max(4, 12 - asp.orb * 1.5),
                              height: Math.max(4, 12 - asp.orb * 1.5),
                              borderRadius: 6,
                            }]} />
                          </View>
                        </GlassCard>
                        {isExpanded && (
                          <GlassCard variant="subtle" style={styles.interpretCard}>
                            <View style={[styles.interpretAccent, { backgroundColor: style.color }]} />
                            <Text style={styles.interpretText}>
                              {ASPECT_MEANINGS[asp.type]}
                            </Text>
                            <Text style={styles.interpretDetail}>
                              {asp.planet1} in {planets.find(p => p.name === asp.planet1)?.sign} {style.label.toLowerCase()}s {asp.planet2} in {planets.find(p => p.name === asp.planet2)?.sign}
                            </Text>
                          </GlassCard>
                        )}
                      </Pressable>
                    );
                  })}
                </>
              )}
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

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  eyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginTop: 8, marginBottom: 7 },
  title: { fontSize: 38, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1.1 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 20, flexWrap: 'wrap' },
  approxBadge: { backgroundColor: Colors.goldDim, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(150,98,198,0.28)', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16, alignSelf: 'flex-start' },
  approxText: { fontSize: 10, color: Colors.gold, fontWeight: '800', letterSpacing: 0.45 },
  signSymbol: { fontSize: 20 },
  subtitle: { fontSize: 16, color: Colors.purpleLight, fontWeight: '600' },
  ascBadge: { backgroundColor: Colors.goldDim, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  ascText: { fontSize: 11, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },

  chartContainer: {
    width: CHART_SIZE, height: CHART_SIZE, marginBottom: 16,
    alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    borderRadius: CHART_SIZE / 2,
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.20)',
    backgroundColor: 'rgba(9,5,27,0.56)',
  },
  chartGlow: {
    position: 'absolute', width: CHART_SIZE + 20, height: CHART_SIZE + 20,
    borderRadius: (CHART_SIZE + 20) / 2, backgroundColor: 'rgba(97,56,163,0.12)',
  },

  aspectToggle: { alignSelf: 'center', marginBottom: 24, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: 'rgba(218,200,242,0.035)' },
  aspectToggleText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },

  // Distribution card
  distributionCard: { marginBottom: 20, gap: 0 },
  distributionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16, letterSpacing: -0.4 },
  distSection: {},
  distLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  distBars: { gap: 8 },
  distBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  distBarLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 80 },
  distBarName: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  distBarTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  distBarFill: { height: 6, borderRadius: 3 },
  distBarCount: { fontSize: 14, fontWeight: '700', width: 20, textAlign: 'right' },
  dominantRow: { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  dominantText: { fontSize: 14, fontWeight: '600', color: Colors.purpleLight, textAlign: 'center' },

  // Aspect legend
  aspectLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 24 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },

  sectionTitle: { fontSize: 24, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.55 },

  planetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginBottom: 6, borderWidth: 1, borderColor: 'transparent',
  },
  planetIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  planetSymbol: { fontSize: 22 },
  planetInfo: { flex: 1 },
  planetName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  planetSign: { fontSize: 13, color: Colors.purpleLight, marginTop: 2 },
  planetMeta: { alignItems: 'flex-end', gap: 4 },
  planetHouse: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },

  interpretCard: { marginBottom: 10, marginLeft: 20, overflow: 'hidden' },
  interpretAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
  interpretText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, paddingLeft: 6 },
  interpretDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 8, paddingLeft: 6 },

  // Aspects list
  aspectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 6, borderWidth: 1, borderColor: 'transparent',
  },
  aspectPlanets: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  aspectPlanetSymbol: { fontSize: 18, fontWeight: '700' },
  aspectTypeSymbol: { fontSize: 14 },
  aspectInfo: { flex: 1 },
  aspectLabel: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  aspectOrb: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  aspectOrbDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aspectOrbInner: {},

  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 8 },
});
