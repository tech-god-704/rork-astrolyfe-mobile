import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Heart, Sparkles, Star, MessageCircle, Shield, Flame, Target, Lightbulb, Check, AlertTriangle, Zap, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { getCompatibility, type CompatibilityResult } from '@/services/compatibility';
import AppBackground from '@/components/AppBackground';

const { width: SCREEN_W } = Dimensions.get('window');
const RING_SIZE = Math.min(200, SCREEN_W - 100);
const RING_CENTER = RING_SIZE / 2;
const RING_R = RING_SIZE / 2 - 12;
const RING_STROKE = 8;

const CATEGORY_META = {
  love: { label: 'Love', Icon: Heart, color: Colors.accent, emoji: '💕' },
  communication: { label: 'Communication', Icon: MessageCircle, color: Colors.purpleLight, emoji: '💬' },
  trust: { label: 'Trust', Icon: Shield, color: Colors.teal, emoji: '🛡️' },
  emotions: { label: 'Emotions', Icon: Flame, color: '#D994F2', emoji: '🔥' },
  values: { label: 'Values', Icon: Target, color: Colors.gold, emoji: '⭐' },
} as const;

type CategoryKey = keyof typeof CATEGORY_META;

const ELEMENT_COMPAT_FLAVOR: Record<string, Record<string, string>> = {
  Fire: {
    Fire: 'A blazing, passionate connection full of energy and excitement',
    Air: 'Air fans the flames — intellectually thrilling and dynamic',
    Earth: 'Fire warms Earth — different speeds, but deep potential',
    Water: 'Steam! Intense chemistry that requires careful balance',
  },
  Air: {
    Fire: 'Air feeds the fire — ideas ignite and passions soar',
    Air: 'A meeting of minds — endless conversation and shared vision',
    Earth: 'Grounding meets flow — patience creates lasting harmony',
    Water: 'Breeze over waves — poetic and deeply emotional when aligned',
  },
  Earth: {
    Fire: 'Fire sparks Earth into action — growth through passion',
    Air: 'Earth grounds Air\'s ideas — build something real together',
    Earth: 'Rock solid — a fortress of trust, loyalty, and stability',
    Water: 'A garden in bloom — nurturing, fertile, and deeply rooted',
  },
  Water: {
    Fire: 'Steam rises — transformative when both honor their depths',
    Air: 'Rain and wind — emotional depth meets intellectual breeze',
    Earth: 'River and shore — a natural, life-giving partnership',
    Water: 'An ocean of feeling — profound empathy and emotional union',
  },
};

function getElementBySign(sign: string): string {
  const elements: Record<string, string> = {
    Aries: 'Fire', Taurus: 'Earth', Gemini: 'Air', Cancer: 'Water',
    Leo: 'Fire', Virgo: 'Earth', Libra: 'Air', Scorpio: 'Water',
    Sagittarius: 'Fire', Capricorn: 'Earth', Aquarius: 'Air', Pisces: 'Water',
  };
  return elements[sign] || 'Fire';
}

const ELEMENT_COLORS: Record<string, string> = {
  Fire: '#EF4444', Earth: '#22C55E', Air: '#06B6D4', Water: '#818CF8',
};

function getDailyCosmicTip(sign1: string, sign2: string): string {
  const tips = [
    `Today is ideal for ${sign1} and ${sign2} to explore a new activity together — shared novelty strengthens your bond.`,
    `The stars suggest a heartfelt conversation tonight. ${sign1}, lead with vulnerability. ${sign2}, listen deeply.`,
    `Physical touch carries extra meaning today for this pairing. Small gestures — a hand squeeze, a shoulder touch — speak volumes.`,
    `Today's energy favors creative collaboration. Try cooking together, starting a playlist, or planning an adventure.`,
    `The cosmos highlight trust-building today. Share something you've never told anyone before.`,
    `Laughter is your superpower today. ${sign1} and ${sign2} should seek out what makes the other smile.`,
    `Today's alignment supports long-term planning. Dream big together — where do you both want to be in a year?`,
  ];
  const today = new Date();
  const dayHash = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const pairHash = sign1.length * 31 + sign2.length * 17 + dayHash;
  return tips[Math.abs(pairHash) % tips.length];
}

export default function CompatibilityScreen() {
  const { profile } = useAuth();
  const userZodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;

  const [partnerSign, setPartnerSign] = useState<string>('');
  const [expandedCategory, setExpandedCategory] = useState<CategoryKey | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'advice'>('overview');

  const result = useMemo<CompatibilityResult | null>(() => {
    if (!profile?.zodiac_sign || !partnerSign) return null;
    return getCompatibility(profile.zodiac_sign, partnerSign);
  }, [profile?.zodiac_sign, partnerSign]);

  const partnerZodiac = partnerSign ? getZodiacByName(partnerSign) : null;

  // Element info
  const userElement = profile?.zodiac_sign ? getElementBySign(profile.zodiac_sign) : '';
  const partnerElement = partnerSign ? getElementBySign(partnerSign) : '';

  // Best/weakest categories
  const { best, weakest } = useMemo(() => {
    if (!result) return { best: null, weakest: null };
    const entries = Object.entries(result.categories) as [CategoryKey, { score: number; text: string }][];
    const sorted = entries.slice().sort((a, b) => b[1].score - a[1].score);
    return { best: sorted[0], weakest: sorted[sorted.length - 1] };
  }, [result]);

  // Animations
  const resultAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (result) {
      resultAnim.setValue(0);
      scoreAnim.setValue(0);
      ringAnim.setValue(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setActiveTab('overview');
      Animated.sequence([
        Animated.spring(resultAnim, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
        Animated.parallel([
          Animated.timing(scoreAnim, { toValue: result.overallScore, duration: 1200, useNativeDriver: false }),
          Animated.timing(ringAnim, { toValue: result.overallScore, duration: 1200, useNativeDriver: false }),
        ]),
      ]).start();
    }
  }, [result, resultAnim, ringAnim, scoreAnim]);

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
  }, [result]);

  const scoreColor = useMemo(() => {
    if (!result) return Colors.accent;
    if (result.overallScore >= 80) return '#22C55E';
    if (result.overallScore >= 65) return Colors.gold;
    if (result.overallScore >= 50) return Colors.purpleLight;
    return Colors.accent;
  }, [result]);

  // SVG ring circumference
  const circumference = 2 * Math.PI * RING_R;

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>COSMIC COMPATIBILITY</Text>
          <Text style={styles.title}>How your energies connect</Text>
          <Text style={styles.subtitle}>A thoughtful sun-sign snapshot—not a verdict on your relationship.</Text>

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
              {userElement && <Text style={[styles.signElement, { color: ELEMENT_COLORS[userElement] }]}>{userElement}</Text>}
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
              {partnerElement && <Text style={[styles.signElement, { color: ELEMENT_COLORS[partnerElement] }]}>{partnerElement}</Text>}
            </View>
          </View>

          {/* Sign Picker Grid */}
          <GlassCard style={styles.pickerCard}>
            <Text style={styles.fieldLabel}>CHOOSE A SIGN TO COMPARE</Text>
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

          {/* Prompt */}
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
              {/* Circular Score Ring */}
              <GlassCard variant="glow" glowColor={scoreColor} style={styles.scoreRingCard}>
                <View style={styles.scoreRingContainer}>
                  <Svg width={RING_SIZE} height={RING_SIZE}>
                    <Defs>
                      <RadialGradient id="scoreGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor={scoreColor} stopOpacity={0.08} />
                        <Stop offset="100%" stopColor={scoreColor} stopOpacity={0} />
                      </RadialGradient>
                    </Defs>
                    <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_R + 20} fill="url(#scoreGlow)" />
                    {/* Track */}
                    <Circle
                      cx={RING_CENTER} cy={RING_CENTER} r={RING_R}
                      fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={RING_STROKE}
                    />
                    {/* Filled arc */}
                    <AnimatedRing
                      cx={RING_CENTER} cy={RING_CENTER} r={RING_R}
                      stroke={scoreColor} strokeWidth={RING_STROKE}
                      circumference={circumference}
                      scoreAnim={ringAnim}
                    />
                  </Svg>
                  <View style={styles.scoreRingInner}>
                    <AnimatedScore score={scoreAnim} color={scoreColor} />
                    <Text style={styles.scoreTagline}>{scoreLabel}</Text>
                  </View>
                </View>

                {/* Quick stats */}
                <View style={styles.quickStats}>
                  {best && (
                    <View style={styles.quickStat}>
                      <Text style={styles.quickStatLabel}>Strongest</Text>
                      <View style={styles.quickStatRow}>
                        {React.createElement(CATEGORY_META[best[0]].Icon, { size: 14, color: CATEGORY_META[best[0]].color })}
                        <Text style={[styles.quickStatValue, { color: CATEGORY_META[best[0]].color }]}>
                          {CATEGORY_META[best[0]].label} {best[1].score}%
                        </Text>
                      </View>
                    </View>
                  )}
                  {weakest && (
                    <View style={styles.quickStat}>
                      <Text style={styles.quickStatLabel}>Needs Work</Text>
                      <View style={styles.quickStatRow}>
                        {React.createElement(CATEGORY_META[weakest[0]].Icon, { size: 14, color: CATEGORY_META[weakest[0]].color })}
                        <Text style={[styles.quickStatValue, { color: CATEGORY_META[weakest[0]].color }]}>
                          {CATEGORY_META[weakest[0]].label} {weakest[1].score}%
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </GlassCard>

              {/* Element Harmony */}
              {userElement && partnerElement && (
                <GlassCard style={styles.elementCard}>
                  <View style={styles.elementHeader}>
                    <View style={[styles.elementBadge, { backgroundColor: `${ELEMENT_COLORS[userElement]}18` }]}>
                      <Text style={[styles.elementBadgeText, { color: ELEMENT_COLORS[userElement] }]}>{userElement}</Text>
                    </View>
                    <Zap size={16} color={Colors.textMuted} />
                    <View style={[styles.elementBadge, { backgroundColor: `${ELEMENT_COLORS[partnerElement]}18` }]}>
                      <Text style={[styles.elementBadgeText, { color: ELEMENT_COLORS[partnerElement] }]}>{partnerElement}</Text>
                    </View>
                  </View>
                  <Text style={styles.elementFlavor}>
                    {ELEMENT_COMPAT_FLAVOR[userElement]?.[partnerElement] ?? 'A unique elemental pairing'}
                  </Text>
                </GlassCard>
              )}

              {/* Tab Navigation */}
              <View style={styles.tabRow}>
                {(['overview', 'details', 'advice'] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    onPress={() => {
                      if (activeTab === tab) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      Animated.timing(tabAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
                        setActiveTab(tab);
                        Animated.timing(tabAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
                      });
                    }}
                  >
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab === 'overview' ? 'Overview' : tab === 'details' ? 'Breakdown' : 'Advice'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <Animated.View style={{ opacity: tabAnim }}>
                  {/* Summary */}
                  <GlassCard style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                      <Sparkles size={16} color={Colors.gold} />
                      <Text style={styles.summaryTitle}>Cosmic Overview</Text>
                    </View>
                    <Text style={styles.summaryText}>{result.summary}</Text>
                  </GlassCard>

                  {/* Visual Category Bars */}
                  <GlassCard style={styles.categoryVisualCard}>
                    {(Object.keys(CATEGORY_META) as CategoryKey[]).map((key) => {
                      const meta = CATEGORY_META[key];
                      const cat = result.categories[key];
                      return (
                        <View key={key} style={styles.categoryVisualRow}>
                          <View style={styles.categoryVisualLabel}>
                            <meta.Icon size={14} color={meta.color} />
                            <Text style={styles.categoryVisualName}>{meta.label}</Text>
                          </View>
                          <View style={styles.categoryVisualTrack}>
                            <View style={[styles.categoryVisualFill, { width: `${cat.score}%`, backgroundColor: meta.color }]} />
                          </View>
                          <Text style={[styles.categoryVisualScore, { color: meta.color }]}>{cat.score}%</Text>
                        </View>
                      );
                    })}
                  </GlassCard>

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
                </Animated.View>
              )}

              {/* Details Tab */}
              {activeTab === 'details' && (
                <Animated.View style={{ opacity: tabAnim }}>
                  <Text style={styles.sectionTitle}>Category Deep Dive</Text>
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
                </Animated.View>
              )}

              {/* Advice Tab */}
              {activeTab === 'advice' && (
                <Animated.View style={{ opacity: tabAnim }}>
                  {/* Daily Cosmic Tip */}
                  <GlassCard variant="glow" glowColor={Colors.indigo} style={styles.dailyTipCard}>
                    <View style={styles.dailyTipHeader}>
                      <RefreshCw size={14} color={Colors.indigoLight} />
                      <Text style={styles.dailyTipLabel}>Today&apos;s Cosmic Tip</Text>
                    </View>
                    <Text style={styles.dailyTipText}>
                      {getDailyCosmicTip(profile?.zodiac_sign ?? '', partnerSign)}
                    </Text>
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

                  {/* Strengths & challenges recap */}
                  <GlassCard style={styles.recapCard}>
                    <Text style={styles.recapTitle}>Key Takeaway</Text>
                    <Text style={styles.recapText}>
                      Your strongest area is {best ? CATEGORY_META[best[0]].label.toLowerCase() : 'love'} at {best ? best[1].score : 0}%.
                      Focus growth energy on {weakest ? CATEGORY_META[weakest[0]].label.toLowerCase() : 'communication'} ({weakest ? weakest[1].score : 0}%)
                      to unlock this pairing&apos;s full potential.
                    </Text>
                  </GlassCard>
                </Animated.View>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Animated circular score ring
function AnimatedRing({ cx, cy, r, stroke, strokeWidth, circumference, scoreAnim }: {
  cx: number; cy: number; r: number; stroke: string; strokeWidth: number;
  circumference: number; scoreAnim: Animated.Value;
}) {
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    const id = scoreAnim.addListener(({ value }) => {
      const offset = circumference - (circumference * value) / 100;
      setDashOffset(offset);
    });
    return () => scoreAnim.removeListener(id);
  }, [scoreAnim, circumference]);

  return (
    <Circle
      cx={cx} cy={cy} r={r}
      fill="none" stroke={stroke} strokeWidth={strokeWidth}
      strokeDasharray={`${circumference}`}
      strokeDashoffset={dashOffset}
      strokeLinecap="round"
      transform={`rotate(-90 ${cx} ${cy})`}
    />
  );
}

// Animated score display
function AnimatedScore({ score, color }: { score: Animated.Value; color: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = score.addListener(({ value }) => {
      setDisplay(Math.round(value));
    });
    return () => score.removeListener(id);
  }, [score]);

  return <Text style={[styles.scoreValue, { color }]}>{display}%</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  eyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginTop: 8, marginBottom: 7 },
  title: { fontSize: 38, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1.1 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginTop: 7, marginBottom: 26, maxWidth: 330 },

  // Signs display
  signsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  signDisplay: { alignItems: 'center', gap: 6 },
  signCircle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  signCircleSymbol: { fontSize: 32 },
  signDisplayName: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  signElement: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heartContainer: { marginTop: -16 },

  // Sign picker
  pickerCard: { marginBottom: 22, borderRadius: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  signGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  signGridItem: {
    width: '30%' as unknown as number, flexDirection: 'row', alignItems: 'center',
    gap: 6, paddingHorizontal: 10, paddingVertical: 11, borderRadius: 14,
    backgroundColor: Colors.bgInput, borderWidth: 1.5, borderColor: Colors.bgInputBorder,
  },
  signGridSymbol: { fontSize: 16 },
  signGridLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },

  // Prompt
  promptContainer: { alignItems: 'center', gap: 12, paddingVertical: 36 },
  promptText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

  // Score ring card
  scoreRingCard: { marginBottom: 16, alignItems: 'center', paddingVertical: 28, borderRadius: 24 },
  scoreRingContainer: { position: 'relative', width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  scoreRingInner: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 46, fontFamily: Fonts.display, fontWeight: '800', letterSpacing: -2 },
  scoreTagline: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

  // Quick stats
  quickStats: { flexDirection: 'row', gap: 24, marginTop: 16 },
  quickStat: { alignItems: 'center', gap: 4 },
  quickStatLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  quickStatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickStatValue: { fontSize: 13, fontWeight: '700' },

  // Element harmony
  elementCard: { marginBottom: 16, alignItems: 'center', gap: 10, paddingVertical: 16 },
  elementHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  elementBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
  elementBadgeText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  elementFlavor: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },

  // Tabs
  tabRow: { flexDirection: 'row', marginBottom: 20, backgroundColor: 'rgba(218,200,242,0.045)', borderRadius: 16, borderWidth: 1, borderColor: Colors.bgCardBorder, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: 'rgba(150,98,198,0.24)' },
  tabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.purpleLight },

  // Summary
  summaryCard: { marginBottom: 20 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },

  // Visual category bars (overview)
  categoryVisualCard: { marginBottom: 20, gap: 12 },
  categoryVisualRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryVisualLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 120 },
  categoryVisualName: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  categoryVisualTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  categoryVisualFill: { height: 6, borderRadius: 3 },
  categoryVisualScore: { fontSize: 14, fontWeight: '700', width: 36, textAlign: 'right' },

  // Section titles
  sectionTitle: { fontSize: 24, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12, letterSpacing: -0.55 },

  // Category cards (details tab)
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

  // Daily tip
  dailyTipCard: { marginBottom: 20, gap: 10 },
  dailyTipHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dailyTipLabel: { fontSize: 12, fontWeight: '700', color: Colors.indigoLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  dailyTipText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },

  // Tips
  tipsCard: { marginBottom: 20, gap: 12 },
  tipsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingLeft: 2 },
  tipText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 21 },

  // Recap card
  recapCard: { marginBottom: 20, gap: 8 },
  recapTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  recapText: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
