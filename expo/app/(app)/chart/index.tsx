import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import Svg, { Circle, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { getPlanets, parseBirthDate, type BirthData, type PlanetPosition } from '@/services/astrology';

const CHART_SIZE = 320;
const CENTER = CHART_SIZE / 2;
const OUTER_R = 148;
const INNER_R = 108;
const SIGN_R = 128;

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

  const planetsQuery = useQuery({
    queryKey: ['planets', profile?.birth_date],
    queryFn: async () => {
      if (!profile?.birth_date) return null;
      const parsed = parseBirthDate(profile.birth_date);
      if (!parsed) return null;
      const data: BirthData = {
        ...parsed,
        hour: 12,
        min: 0,
        lat: 40.7128,
        lon: -74.006,
        tzone: -5.0,
      };
      try {
        return await getPlanets(data);
      } catch (e) {
        console.log('[Chart] Planets API error:', e);
        return null;
      }
    },
    enabled: !!profile?.birth_date,
    retry: false,
  });

  const planets = planetsQuery.data;
  const displayPlanets = planets ?? [
    { name: 'Sun', sign: userSign?.name ?? '—', house: 1, isRetro: 'false', fullDegree: 0, normDegree: 0, signLord: '' },
    { name: 'Moon', sign: 'Cancer', house: 4, isRetro: 'false', fullDegree: 0, normDegree: 0, signLord: '' },
    { name: 'Mercury', sign: 'Gemini', house: 3, isRetro: 'false', fullDegree: 0, normDegree: 0, signLord: '' },
    { name: 'Venus', sign: 'Libra', house: 7, isRetro: 'false', fullDegree: 0, normDegree: 0, signLord: '' },
    { name: 'Mars', sign: 'Aries', house: 1, isRetro: 'false', fullDegree: 0, normDegree: 0, signLord: '' },
    { name: 'Jupiter', sign: 'Sagittarius', house: 9, isRetro: 'false', fullDegree: 0, normDegree: 0, signLord: '' },
  ] as PlanetPosition[];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Natal Chart</Text>
          <View style={styles.subtitleRow}>
            {userSign && <Text style={styles.signSymbol}>{userSign.symbol}</Text>}
            <Text style={styles.subtitle}>
              {userSign ? userSign.name : 'Complete your profile to see your chart'}
            </Text>
            {!planets && !planetsQuery.isLoading && <View style={styles.placeholderBadge}><Text style={styles.placeholderText}>Sample</Text></View>}
          </View>

          {/* Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartGlow} />
            <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
              <Defs>
                <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={Colors.purple} stopOpacity={0.15} />
                  <Stop offset="100%" stopColor={Colors.purple} stopOpacity={0} />
                </RadialGradient>
              </Defs>

              {/* Background glow */}
              <Circle cx={CENTER} cy={CENTER} r={60} fill="url(#centerGlow)" />

              {/* Outer ring */}
              <Circle cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke="rgba(167,139,250,0.25)" strokeWidth={1.5} />
              {/* Inner ring */}
              <Circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth={1} />
              {/* Center ring */}
              <Circle cx={CENTER} cy={CENTER} r={60} fill="none" stroke="rgba(167,139,250,0.1)" strokeWidth={0.5} />

              {ZODIAC_SIGNS.map((sign, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const midAngle = ((i * 30 + 15) - 90) * (Math.PI / 180);
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
                      x={sx}
                      y={sy}
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
                const a = (deg - 90) * (Math.PI / 180);
                return (
                  <Line
                    key={deg}
                    x1={CENTER}
                    y1={CENTER}
                    x2={CENTER + Math.cos(a) * 58}
                    y2={CENTER + Math.sin(a) * 58}
                    stroke={deg % 90 === 0 ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.08)'}
                    strokeWidth={deg % 90 === 0 ? 1 : 0.5}
                  />
                );
              })}

              {/* Center dot */}
              <Circle cx={CENTER} cy={CENTER} r={5} fill={Colors.gold} />
              <Circle cx={CENTER} cy={CENTER} r={3} fill={Colors.goldLight} />
            </Svg>
          </View>

          {/* Planetary Positions */}
          <Text style={styles.sectionTitle}>
            Planetary Positions
            {planetsQuery.isLoading && ' (loading...)'}
          </Text>

          {planetsQuery.isLoading ? (
            <ActivityIndicator color={Colors.purple} style={{ marginTop: 20 }} />
          ) : (
            <View style={styles.planetGrid}>
              {displayPlanets.map((p) => {
                const color = PLANET_COLORS[p.name] ?? Colors.purpleLight;
                return (
                  <GlassCard key={p.name} variant="subtle" style={styles.planetCard}>
                    <View style={[styles.planetIconCircle, { backgroundColor: `${color}18` }]}>
                      <Text style={[styles.planetSymbol, { color }]}>{PLANET_SYMBOLS[p.name] ?? ''}</Text>
                    </View>
                    <Text style={styles.planetName}>{p.name}</Text>
                    <Text style={styles.planetSign}>{p.sign}</Text>
                    <Text style={styles.planetHouse}>
                      {p.house ? `${p.house}${getOrdinal(p.house)} House` : '—'}
                      {p.isRetro === 'true' ? ' R' : ''}
                    </Text>
                  </GlassCard>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function getOrdinal(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, letterSpacing: -0.5 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 24 },
  signSymbol: { fontSize: 20 },
  subtitle: { fontSize: 16, color: Colors.purpleLight, fontWeight: '600' },
  placeholderBadge: { backgroundColor: Colors.goldDim, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  placeholderText: { fontSize: 10, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },

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

  planetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  planetCard: {
    width: '47%' as unknown as number,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  planetIconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  planetSymbol: { fontSize: 22 },
  planetName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  planetSign: { fontSize: 13, color: Colors.purpleLight },
  planetHouse: { fontSize: 11, color: Colors.textMuted },
});
