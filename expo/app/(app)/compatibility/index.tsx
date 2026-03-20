import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Heart, Sparkles, Star, Check, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { parseBirthDate, getWesternHoroscope, type BirthData } from '@/services/astrology';
import { getProfileLocation } from '@/services/location';

interface CompatibilityResult {
  score: number;
  description: string;
  strengths: string[];
  challenges: string[];
}

export default function CompatibilityScreen() {
  const { profile } = useAuth();
  const userZodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;

  const [partnerSign, setPartnerSign] = useState<string>('');
  const [partnerBirthDate, setPartnerBirthDate] = useState<string>('');
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Animated score
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;
  const resultSlide = useRef(new Animated.Value(30)).current;

  const compatMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.zodiac_sign || !partnerSign) {
        throw new Error('Please select both zodiac signs');
      }

      if (profile.birth_date && partnerBirthDate) {
        const parsed1 = parseBirthDate(profile.birth_date);
        const parsed2 = parseBirthDate(partnerBirthDate);
        if (parsed1 && parsed2) {
          const loc = getProfileLocation(profile.birth_lat, profile.birth_lon);
          const data1: BirthData = { ...parsed1, hour: 12, min: 0, lat: loc.lat, lon: loc.lon, tzone: loc.tzone };
          const data2: BirthData = { ...parsed2, hour: 12, min: 0, lat: loc.lat, lon: loc.lon, tzone: loc.tzone };
          try {
            const apiResult = await getWesternHoroscope(data1, data2);
            if (apiResult && typeof apiResult === 'object') {
              return {
                score: typeof apiResult.score === 'number' ? apiResult.score : calculateZodiacScore(profile.zodiac_sign, partnerSign),
                description: typeof apiResult.description === 'string' ? apiResult.description : getZodiacDescription(profile.zodiac_sign, partnerSign),
                strengths: Array.isArray(apiResult.strengths) ? apiResult.strengths as string[] : getStrengths(profile.zodiac_sign, partnerSign),
                challenges: Array.isArray(apiResult.challenges) ? apiResult.challenges as string[] : getChallenges(profile.zodiac_sign, partnerSign),
              } as CompatibilityResult;
            }
          } catch (e) {
            console.log('[Compatibility] API error, falling back to local:', e);
          }
        }
      }

      return {
        score: calculateZodiacScore(profile.zodiac_sign, partnerSign),
        description: getZodiacDescription(profile.zodiac_sign, partnerSign),
        strengths: getStrengths(profile.zodiac_sign, partnerSign),
        challenges: getChallenges(profile.zodiac_sign, partnerSign),
      } as CompatibilityResult;
    },
    onSuccess: (data) => {
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

      // Animate score and result appearance
      scoreAnim.setValue(0);
      resultOpacity.setValue(0);
      resultSlide.setValue(30);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(resultOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(resultSlide, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
        ]),
        Animated.timing(scoreAnim, { toValue: data.score, duration: 1200, useNativeDriver: false }),
      ]).start();
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleCheck = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    compatMutation.mutate();
  }, [compatMutation]);

  const partnerZodiac = partnerSign ? getZodiacByName(partnerSign) : null;

  // Animated score display
  const displayScore = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 100],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Compatibility</Text>
          <Text style={styles.subtitle}>Discover your cosmic connection</Text>

          {/* Signs Display */}
          <View style={styles.signsRow}>
            <View style={styles.signDisplay}>
              <View style={[styles.signCircle, { borderColor: userZodiac?.color ?? Colors.purple }]}>
                <Text style={styles.signCircleSymbol}>{userZodiac?.symbol ?? '?'}</Text>
              </View>
              <Text style={styles.signDisplayName}>{userZodiac?.name ?? 'You'}</Text>
            </View>

            <View style={styles.heartContainer}>
              <Heart size={24} color={Colors.accent} fill={result ? Colors.accent : 'none'} />
            </View>

            <View style={styles.signDisplay}>
              <View style={[styles.signCircle, partnerZodiac ? { borderColor: partnerZodiac.color } : {}]}>
                <Text style={styles.signCircleSymbol}>{partnerZodiac?.symbol ?? '?'}</Text>
              </View>
              <Text style={styles.signDisplayName}>{partnerZodiac?.name ?? 'Partner'}</Text>
            </View>
          </View>

          {/* Partner Sign Picker */}
          <GlassCard style={styles.partnerCard}>
            <Text style={styles.fieldLabel}>Select partner's sign</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.signScroll} contentContainerStyle={styles.signScrollContent}>
              {ZODIAC_SIGNS.map((sign) => {
                const isSelected = partnerSign === sign.name;
                return (
                  <Pressable
                    key={sign.name}
                    style={[styles.signChip, isSelected && { backgroundColor: `${sign.color}15`, borderColor: sign.color }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setPartnerSign(sign.name);
                    }}
                  >
                    <Text style={[styles.signChipSymbol, isSelected && { fontSize: 20 }]}>{sign.symbol}</Text>
                    <Text style={[styles.signChipLabel, isSelected && { color: sign.color }]}>{sign.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Partner's birth date (optional)</Text>
            <View style={[styles.inputWrap, focusedField === 'date' && styles.inputWrapFocused]}>
              <TextInput
                style={styles.input}
                value={partnerBirthDate}
                onChangeText={setPartnerBirthDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                onFocus={() => setFocusedField('date')}
                onBlur={() => setFocusedField(null)}
              />
            </View>
          </GlassCard>

          <Pressable
            style={({ pressed }) => [
              styles.checkBtn,
              pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
              (!partnerSign || !profile?.zodiac_sign) && { opacity: 0.4 },
            ]}
            onPress={handleCheck}
            disabled={!partnerSign || !profile?.zodiac_sign || compatMutation.isPending}
          >
            <LinearGradient colors={[Colors.accent, '#E11D48']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.checkBtnInner}>
              {compatMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Heart size={18} color="#fff" />
                  <Text style={styles.checkBtnText}>Check Compatibility</Text>
                  <ArrowRight size={16} color="#fff" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          {result && (
            <Animated.View style={[styles.resultSection, { opacity: resultOpacity, transform: [{ translateY: resultSlide }] }]}>
              {/* Score Card */}
              <GlassCard variant="glow" glowColor={Colors.accent} style={styles.scoreCard}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreEmoji}>{userZodiac?.symbol ?? '?'}</Text>
                  <View style={styles.scoreCenter}>
                    <AnimatedScoreText score={displayScore} />
                    <Text style={styles.scoreLabel}>Match Score</Text>
                  </View>
                  <Text style={styles.scoreEmoji}>{partnerZodiac?.symbol ?? '?'}</Text>
                </View>
                <View style={styles.scoreBar}>
                  <Animated.View style={[styles.scoreBarFill, {
                    width: scoreAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                  }]}>
                    <LinearGradient colors={[Colors.accent, '#E11D48']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                  </Animated.View>
                </View>
              </GlassCard>

              {/* Description */}
              <GlassCard style={styles.descCard}>
                <Sparkles size={18} color={Colors.gold} />
                <Text style={styles.descText}>{result.description}</Text>
              </GlassCard>

              {/* Strengths */}
              {result.strengths.length > 0 && (
                <GlassCard style={styles.listCard}>
                  <Text style={styles.listTitle}>Strengths</Text>
                  {result.strengths.map((s, i) => (
                    <View key={i} style={styles.listItemRow}>
                      <View style={[styles.listDot, { backgroundColor: Colors.success }]} />
                      <Text style={styles.listItem}>{s}</Text>
                    </View>
                  ))}
                </GlassCard>
              )}

              {/* Challenges */}
              {result.challenges.length > 0 && (
                <GlassCard style={styles.listCard}>
                  <Text style={[styles.listTitle, { color: Colors.accent }]}>Challenges</Text>
                  {result.challenges.map((c, i) => (
                    <View key={i} style={styles.listItemRow}>
                      <View style={[styles.listDot, { backgroundColor: Colors.accent }]} />
                      <Text style={styles.listItem}>{c}</Text>
                    </View>
                  ))}
                </GlassCard>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Animated score text component
function AnimatedScoreText({ score }: { score: Animated.AnimatedInterpolation<number> }) {
  const [displayValue, setDisplayValue] = useState(0);
  const listenerId = useRef<string | null>(null);

  useEffect(() => {
    const id = score.addListener(({ value }) => {
      setDisplayValue(Math.round(value));
    });
    listenerId.current = id;
    return () => {
      score.removeListener(id);
    };
  }, [score]);

  return <Text style={styles.scoreValue}>{displayValue}%</Text>;
}

// Local zodiac compatibility logic
function getElementOf(sign: string): string {
  const z = getZodiacByName(sign);
  return z?.element ?? 'Unknown';
}

function signHash(s1: string, s2: string): number {
  const str = [s1, s2].sort().join('');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function calculateZodiacScore(sign1: string, sign2: string): number {
  const el1 = getElementOf(sign1);
  const el2 = getElementOf(sign2);
  const variation = signHash(sign1, sign2) % 10;
  if (el1 === el2) return 85 + variation;
  const compat: Record<string, string[]> = {
    Fire: ['Air'], Air: ['Fire'], Earth: ['Water'], Water: ['Earth'],
  };
  if (compat[el1]?.includes(el2)) return 70 + variation;
  return 50 + variation;
}

function getZodiacDescription(sign1: string, sign2: string): string {
  const el1 = getElementOf(sign1);
  const el2 = getElementOf(sign2);
  if (el1 === el2) return `${sign1} and ${sign2} share the ${el1} element, creating a natural understanding and deep resonance. Your energies align beautifully, fostering an intuitive connection.`;
  return `${sign1} (${el1}) and ${sign2} (${el2}) bring complementary energies together. This dynamic pairing offers growth through balancing each other's unique strengths.`;
}

function getStrengths(sign1: string, sign2: string): string[] {
  const el1 = getElementOf(sign1);
  const el2 = getElementOf(sign2);
  if (el1 === el2) return ['Natural understanding', 'Shared core values', 'Easy communication', 'Mutual respect'];
  return ['Complementary strengths', 'Growth opportunities', 'Balance of energies'];
}

function getChallenges(sign1: string, sign2: string): string[] {
  const el1 = getElementOf(sign1);
  const el2 = getElementOf(sign2);
  if (el1 === el2) return ['May lack variety', 'Similar blind spots'];
  return ['Different communication styles', 'Need for compromise', 'Patience required'];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },

  signsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 24 },
  signDisplay: { alignItems: 'center', gap: 8 },
  signCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: Colors.bgCardBorder,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signCircleSymbol: { fontSize: 30 },
  signDisplayName: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  heartContainer: { marginTop: -20 },

  partnerCard: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  signScroll: { marginBottom: 4 },
  signScrollContent: { gap: 8, paddingVertical: 4 },
  signChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: Colors.bgInput,
    borderWidth: 1.5,
    borderColor: Colors.bgInputBorder,
  },
  signChipSymbol: { fontSize: 16 },
  signChipLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  inputWrap: {
    backgroundColor: Colors.bgInput,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
  },
  inputWrapFocused: { borderColor: Colors.purpleGlow, backgroundColor: Colors.bgInputFocused },
  input: { fontSize: 15, color: Colors.textPrimary },

  checkBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 24 },
  checkBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  checkBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  resultSection: { gap: 14 },
  scoreCard: { alignItems: 'center', paddingVertical: 24 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 28, marginBottom: 20 },
  scoreEmoji: { fontSize: 40 },
  scoreCenter: { alignItems: 'center' },
  scoreValue: { fontSize: 48, fontWeight: '800', color: Colors.accent, letterSpacing: -2 },
  scoreLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 },
  scoreBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: 6, borderRadius: 3, overflow: 'hidden' },

  descCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  descText: { flex: 1, fontSize: 15, color: Colors.textSecondary, lineHeight: 23 },
  listCard: { gap: 10 },
  listTitle: { fontSize: 15, fontWeight: '700', color: Colors.success },
  listItemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  listDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  listItem: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
});
