import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Sparkles, Star, MessageCircle, Shield, Flame, Target, Lightbulb, Check, AlertTriangle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { getCompatibility, type CompatibilityResult } from '@/services/compatibility';

const CATEGORY_META = {
  love: { label: 'Love', Icon: Heart, color: Colors.accent },
  communication: { label: 'Communication', Icon: MessageCircle, color: Colors.purpleLight },
  trust: { label: 'Trust', Icon: Shield, color: Colors.teal },
  emotions: { label: 'Emotions', Icon: Flame, color: '#F97316' },
  values: { label: 'Values', Icon: Target, color: Colors.gold },
} as const;

type CategoryKey = keyof typeof CATEGORY_META;

export default function CompatibilityScreen() {
  const { profile } = useAuth();
  const userZodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;

  const [partnerSign, setPartnerSign] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);

  // Result is computed locally — instant, no loading
  const result = useMemo<CompatibilityResult | null>(() => {
    if (!profile?.zodiac_sign || !partnerSign) return null;
    return getCompatibility(profile.zodiac_sign, partnerSign);
  }, [profile?.zodiac_sign, partnerSign]);

  const partnerZodiac = partnerSign ? getZodiacByName(partnerSign) : null;

  // Animations
  const resultAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (result) {
      resultAnim.setValue(0);
      scoreAnim.setValue(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.sequence([
        Animated.spring(resultAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.timing(scoreAnim, { toValue: result.overallScore, duration: 1000, useNativeDriver: false }),
      ]).start();
    }
  }, [result?.overallScore]);

  const handleSignSelect = useCallback((name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPartnerSign(name);
    setExpandedCategory(null);
  }, []);

  const toggleCategory = useCallback((key: CategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setExpandedCategory((prev: CategoryKey | null) => prev === key ? null : key);
  }, []);

  const scoreLabel = useMemo(() => {
    if (!result) return '';
    if (result.overallScore >= 85) return 'Cosmic Soulmates';
    if (result.overallScore >= 75) return 'Strong Connection';
    if (result.overallScore >= 65) return 'Great Potential';
    if (result.overallScore >= 55) return 'Growth Together';
    return 'Opposites Attract';
  }, [result?.overallScore]);

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
              <LinearGradient
                colors={userZodiac ? [userZodiac.color + '30', userZodiac.color + '08'] : [Colors.purpleDim, 'transparent']}
                style={styles.signCircle}
              >
                <Text style={styles.signCircleSymbol}>{userZodiac?.symbol ?? '?'}</Text>
              </LinearGradient>
              <Text style={styles.signDisplayName}>{userZodiac?.name ?? 'You'}</Text>
            </View>

            <View style={styles.heartContainer}>
              <Animated.View style={result ? {
                transform: [{
                  scale: scoreAnim.interpolate({
                    inputRange: [0, 50, 100],
                    outputRange: [0.8, 1, 1.2],
                    extrapolate: 'clamp',
                  }),
                }],
              } : undefined}>
                <Heart size={28} color={Colors.accent} fill={result ? Colors.accent : 'none'} />
              </Animated.View>
            </View>

            <View style={styles.signDisplay}>
              <LinearGradient
                colors={partnerZodiac ? [partnerZodiac.color + '30', partnerZodiac.color + '08'] : [Colors.bgCard, 'transparent']}
                style={[styles.signCircle, !partnerZodiac && { borderWidth: 2, borderColor: Colors.bgCardBorder }]}
              >
                <Text style={styles.signCircleSymbol}>{partnerZodiac?.symbol ?? '?'}</Text>
              </LinearGradient>
              <Text style={styles.signDisplayName}>{partnerZodiac?.name ?? 'Partner'}</Text>
            </View>
          </View>

          {/* Sign Picker Grid */}
          <GlassCard style={styles.pickerCard}>
            <Text style={styles.fieldLabel}>Select partner's sign</Text>
            <View style={styles.signGrid}>
              {ZODIAC_SIGNS.map((sign) => {
                const isSelected = partnerSign === sign.name;
                return (
                  <Pressable
                    key={sign.name}
                    style={({ pressed }) => [
                      styles.signGridItem,
                      isSelected && { backgroundColor: `${sign.color}18`, borderColor: sign.color },
                      pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] },
                    ]}
                    onPress={() => handleSignSelect(sign.name)}
                  >
                    <Text style={[styles.signGridSymbol, isSelected && { fontSize: 24 }]}>{sign.symbol}</Text>
                    <Text style={[styles.signGridLabel, isSelected && { color: sign.color, fontWeight: '700' }]}>{sign.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {/* Prompt to select */}
          {!result && (
            <View style={styles.promptContainer}>
              <Sparkles size={20} color={Colors.textMuted} />
              <Text style={styles.promptText}>
                {!profile?.zodiac_sign
                  ? 'Set your zodiac sign in your profile to get started'
                  : 'Tap a sign above to see your cosmic compatibility'}
              </Text>
            </View>
          )}

          {/* Results */}
          {result && (
            <Animated.View style={{
              opacity: resultAnim,
              transform: [{ translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
            }}>
              {/* Score Card */}
              <GlassCard variant="glow" glowColor={Colors.accent} style={styles.scoreCard}>
                <LinearGradient
                  colors={['rgba(244,114,182,0.08)', 'transparent']}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.scoreHeader}>
                  <Text style={styles.scoreEmoji}>{userZodiac?.symbol}</Text>
                  <View style={styles.scoreCenter}>
                    <AnimatedScore score={scoreAnim} />
                    <Text style={styles.scoreTagline}>{scoreLabel}</Text>
                  </View>
                  <Text style={styles.scoreEmoji}>{partnerZodiac?.symbol}</Text>
                </View>
                <View style={styles.scoreBarTrack}>
                  <Animated.View style={[styles.scoreBarFill, {
                    width: scoreAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                  }]}>
                    <LinearGradient
                      colors={[Colors.accent, '#E11D48', Colors.purple]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </Animated.View>
                </View>
              </GlassCard>

              {/* Summary */}
              <GlassCard style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <Sparkles size={16} color={Colors.gold} />
                  <Text style={styles.summaryTitle}>Cosmic Overview</Text>
                </View>
                <Text style={styles.summaryText}>{result.summary}</Text>
              </GlassCard>

              {/* Category Breakdown */}
              <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
              {(Object.keys(CATEGORY_META) as CategoryKey[]).map((key) => {
                const meta = CATEGORY_META[key];
                const cat = result.categories[key];
                const isExpanded = expandedCategory === key;
                const IconComp = meta.Icon;

                return (
                  <Pressable key={key} onPress={() => toggleCategory(key)}>
                    <GlassCard style={[styles.categoryCard, isExpanded && { borderColor: `${meta.color}30` }]}>
                      <View style={styles.categoryHeader}>
                        <View style={[styles.categoryIconCircle, { backgroundColor: `${meta.color}15` }]}>
                          <IconComp size={18} color={meta.color} />
                        </View>
                        <View style={styles.categoryInfo}>
                          <Text style={styles.categoryLabel}>{meta.label}</Text>
                          <View style={styles.categoryBarTrack}>
                            <View style={[styles.categoryBarFill, { width: `${cat.score}%`, backgroundColor: meta.color }]} />
                          </View>
                        </View>
                        <Text style={[styles.categoryScore, { color: meta.color }]}>{cat.score}%</Text>
                      </View>
                      {isExpanded && (
                        <View style={styles.categoryExpanded}>
                          <View style={[styles.categoryDivider, { backgroundColor: `${meta.color}20` }]} />
                          <Text style={styles.categoryText}>{cat.text}</Text>
                        </View>
                      )}
                    </GlassCard>
                  </Pressable>
                );
              })}

              {/* Strengths */}
              <Text style={styles.sectionTitle}>Strengths</Text>
              <GlassCard style={styles.listCard}>
                {result.strengths.map((s, i) => (
                  <View key={i} style={styles.listRow}>
                    <View style={[styles.listIconCircle, { backgroundColor: Colors.successDim }]}>
                      <Check size={12} color={Colors.success} />
                    </View>
                    <Text style={styles.listText}>{s}</Text>
                  </View>
                ))}
              </GlassCard>

              {/* Challenges */}
              <Text style={styles.sectionTitle}>Challenges</Text>
              <GlassCard style={styles.listCard}>
                {result.challenges.map((c, i) => (
                  <View key={i} style={styles.listRow}>
                    <View style={[styles.listIconCircle, { backgroundColor: Colors.accentDim }]}>
                      <AlertTriangle size={12} color={Colors.accent} />
                    </View>
                    <Text style={styles.listText}>{c}</Text>
                  </View>
                ))}
              </GlassCard>

              {/* Tips */}
              <Text style={styles.sectionTitle}>Relationship Tips</Text>
              <GlassCard variant="glow" glowColor={Colors.gold} style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                  <Lightbulb size={16} color={Colors.gold} />
                  <Text style={styles.tipsTitle}>Cosmic Advice</Text>
                </View>
                {result.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Star size={12} color={Colors.gold} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </GlassCard>
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Animated score display
function AnimatedScore({ score }: { score: Animated.Value }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = score.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });
    return () => score.removeListener(id);
  }, [score]);

  return <Text style={styles.scoreValue}>{display}%</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },

  // Signs display
  signsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 },
  signDisplay: { alignItems: 'center', gap: 8 },
  signCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signCircleSymbol: { fontSize: 32 },
  signDisplayName: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  heartContainer: { marginTop: -16 },

  // Sign picker
  pickerCard: { marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  signGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  signGridItem: {
    width: '29%' as unknown as number,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: Colors.bgInput,
    borderWidth: 1.5,
    borderColor: Colors.bgInputBorder,
  },
  signGridSymbol: { fontSize: 18 },
  signGridLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },

  // Prompt
  promptContainer: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  promptText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },

  // Score card
  scoreCard: { marginBottom: 16, paddingVertical: 28, paddingHorizontal: 20 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 20 },
  scoreEmoji: { fontSize: 36 },
  scoreCenter: { alignItems: 'center', flexShrink: 1 },
  scoreValue: { fontSize: 48, fontWeight: '800', color: Colors.accent, letterSpacing: -2 },
  scoreTagline: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  scoreBarTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  scoreBarFill: { height: 6, borderRadius: 3, overflow: 'hidden' },

  // Summary
  summaryCard: { marginBottom: 20 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },

  // Section titles
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12, letterSpacing: -0.3 },

  // Category cards
  categoryCard: { marginBottom: 10, borderWidth: 1, borderColor: 'transparent' },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  categoryInfo: { flex: 1, gap: 6 },
  categoryLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  categoryBarTrack: { height: 4, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' },
  categoryBarFill: { height: 4, borderRadius: 2 },
  categoryScore: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  categoryExpanded: { marginTop: 14 },
  categoryDivider: { height: 1, marginBottom: 12 },
  categoryText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },

  // Lists
  listCard: { marginBottom: 16, gap: 12 },
  listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  listIconCircle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  listText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },

  // Tips
  tipsCard: { marginBottom: 20, gap: 12 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingLeft: 2 },
  tipText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },
});
