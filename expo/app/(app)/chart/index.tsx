import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';

const CHART_SIZE = 300;
const CENTER = CHART_SIZE / 2;
const OUTER_R = 140;
const INNER_R = 100;
const SIGN_R = 120;

export default function ChartScreen() {
  const { profile } = useAuth();
  const userSign = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Natal Chart</Text>
          <Text style={styles.subtitle}>{userSign ? `${userSign.symbol} ${userSign.name}` : 'Complete your profile to see your chart'}</Text>

          <View style={styles.chartContainer}>
            <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
              <Circle cx={CENTER} cy={CENTER} r={OUTER_R} fill="none" stroke="rgba(124,58,237,0.3)" strokeWidth={1} />
              <Circle cx={CENTER} cy={CENTER} r={INNER_R} fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth={1} />
              <Circle cx={CENTER} cy={CENTER} r={60} fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth={1} />

              {ZODIAC_SIGNS.map((sign, i) => {
                const angle = (i * 30 - 90) * (Math.PI / 180);
                const _endAngle = ((i + 1) * 30 - 90) * (Math.PI / 180);
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
                    <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(124,58,237,0.2)" strokeWidth={0.5} />
                    <SvgText
                      x={sx}
                      y={sy}
                      fill={isUser ? Colors.gold : 'rgba(255,255,255,0.5)'}
                      fontSize={isUser ? 16 : 13}
                      textAnchor="middle"
                      alignmentBaseline="central"
                    >
                      {sign.symbol}
                    </SvgText>
                  </G>
                );
              })}

              {[0, 60, 120, 180, 240, 300].map((deg) => {
                const a = (deg - 90) * (Math.PI / 180);
                return (
                  <Line
                    key={deg}
                    x1={CENTER}
                    y1={CENTER}
                    x2={CENTER + Math.cos(a) * 58}
                    y2={CENTER + Math.sin(a) * 58}
                    stroke="rgba(124,58,237,0.15)"
                    strokeWidth={0.5}
                  />
                );
              })}

              <Circle cx={CENTER} cy={CENTER} r={4} fill={Colors.gold} />
            </Svg>
          </View>

          <Text style={styles.sectionTitle}>Planetary Positions</Text>
          <GlassCard style={styles.planetCard}>
            {[
              { planet: '☉ Sun', sign: userSign?.name ?? '—', house: '1st House' },
              { planet: '☽ Moon', sign: 'Cancer', house: '4th House' },
              { planet: '☿ Mercury', sign: 'Gemini', house: '3rd House' },
              { planet: '♀ Venus', sign: 'Libra', house: '7th House' },
              { planet: '♂ Mars', sign: 'Aries', house: '1st House' },
              { planet: '♃ Jupiter', sign: 'Sagittarius', house: '9th House' },
            ].map((p) => (
              <View key={p.planet} style={styles.planetRow}>
                <Text style={styles.planetName}>{p.planet}</Text>
                <Text style={styles.planetSign}>{p.sign}</Text>
                <Text style={styles.planetHouse}>{p.house}</Text>
              </View>
            ))}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800' as const, color: Colors.textPrimary, alignSelf: 'flex-start', marginTop: 8 },
  subtitle: { fontSize: 16, color: Colors.purpleLight, alignSelf: 'flex-start', marginTop: 4, marginBottom: 24, fontWeight: '600' as const },
  chartContainer: { width: CHART_SIZE, height: CHART_SIZE, marginBottom: 32, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary, alignSelf: 'flex-start', marginBottom: 14 },
  planetCard: { width: '100%', gap: 14 },
  planetRow: { flexDirection: 'row', alignItems: 'center' },
  planetName: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600' as const, width: 100 },
  planetSign: { fontSize: 14, color: Colors.purpleLight, flex: 1 },
  planetHouse: { fontSize: 13, color: Colors.textMuted },
});
