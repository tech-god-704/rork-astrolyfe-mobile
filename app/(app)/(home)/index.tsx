import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Sun, MessageCircle, Heart, Sparkles, BookOpen, Compass, ChevronRight, Star, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { getZodiacByName, getMoonPhase } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { getHoroscope, fetchCuratedHoroscope, categorizeHoroscope } from '@/services/horoscope';

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const moonPhase = getMoonPhase();
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;

  // Try curated horoscope from Supabase, fall back to instant local generation
  const signName = profile?.zodiac_sign || 'Aries';
  const localReading = useMemo(() => getHoroscope(signName, 'daily'), [signName]);

  const curatedQuery = useQuery({
    queryKey: ['curatedHoroscope', signName, 'daily'],
    queryFn: () => fetchCuratedHoroscope(signName, 'daily'),
    staleTime: 1000 * 60 * 30,
  });

  const activeReading = curatedQuery.data ?? localReading;
  const categories = useMemo(() => categorizeHoroscope(activeReading), [activeReading]);

  const firstCategory = categories[0];
  const remainingCount = categories.length - 1;

  // Animations
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(20)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsTranslateY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(heroTranslateY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardsTranslateY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const onRefresh = useCallback(() => {
    // Content is generated locally and changes daily
  }, []);

  const handlePress = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(route as never);
  }, [router]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={Colors.purple} />}
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }]}>
            <View>
              <Text style={styles.greeting}>{greeting()}</Text>
              <Text style={styles.userName}>{profile?.display_name || 'Stargazer'}</Text>
            </View>
            <Pressable
              onPress={() => handlePress('/(app)/profile')}
              style={({ pressed }) => [styles.avatarBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }]}
            >
              {zodiac ? (
                <LinearGradient colors={[Colors.purple, Colors.indigoLight]} style={styles.signBadge}>
                  <Text style={styles.signSymbol}>{zodiac.symbol}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.signBadgePlain}>
                  <Text style={styles.signSymbol}>?</Text>
                </View>
              )}
            </Pressable>
          </Animated.View>

          {/* Hero Horoscope Card */}
          <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }}>
            <Pressable onPress={() => handlePress('/(app)/horoscope')} style={({ pressed }) => [pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}>
              <GlassCard variant="elevated" style={styles.heroCard}>
                <LinearGradient
                  colors={['rgba(124,58,237,0.15)', 'rgba(99,102,241,0.08)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.heroTop}>
                  <View style={styles.heroLabel}>
                    <Sparkles size={14} color={Colors.gold} />
                    <Text style={styles.heroLabelText}>Today's Horoscope</Text>
                  </View>
                  <View style={styles.moonBadge}>
                    <Text style={styles.moonEmoji}>{moonPhase.emoji}</Text>
                    <Text style={styles.moonText}>{moonPhase.name}</Text>
                  </View>
                </View>

                {zodiac && (
                  <View style={styles.heroSignRow}>
                    <Text style={styles.heroSignSymbol}>{zodiac.symbol}</Text>
                    <Text style={styles.heroSignName}>{zodiac.name}</Text>
                    <View style={[styles.heroElementBadge, { backgroundColor: `${zodiac.color}20` }]}>
                      <Text style={[styles.heroElementText, { color: zodiac.color }]}>{zodiac.element}</Text>
                    </View>
                  </View>
                )}

                {firstCategory ? (
                  <View style={styles.heroContent}>
                    <Text style={styles.heroText} numberOfLines={4}>{firstCategory.content}</Text>
                    {remainingCount > 0 && (
                      <View style={styles.moreBadge}>
                        <TrendingUp size={12} color={Colors.purpleLight} />
                        <Text style={styles.moreCategories}>+{remainingCount} more insights</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.heroContent}>
                    <Text style={styles.heroPlaceholder}>
                      Set your zodiac sign in your profile to receive daily readings.
                    </Text>
                  </View>
                )}

                <View style={styles.heroFooter}>
                  <Text style={styles.readMoreText}>Read Full Horoscope</Text>
                  <ChevronRight size={16} color={Colors.purpleLight} />
                </View>
              </GlassCard>
            </Pressable>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View style={{ opacity: cardsOpacity, transform: [{ translateY: cardsTranslateY }] }}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <View style={styles.quickActions}>
              <Pressable style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]} onPress={() => handlePress('/(app)/horoscope')}>
                <LinearGradient colors={['rgba(251,191,36,0.12)', 'rgba(251,191,36,0.03)']} style={styles.actionGradient}>
                  <View style={[styles.actionIconCircle, { backgroundColor: Colors.goldDim }]}>
                    <Sun size={22} color={Colors.gold} />
                  </View>
                  <Text style={styles.actionLabel}>Daily{'\n'}Reading</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]} onPress={() => handlePress('/(app)/compatibility')}>
                <LinearGradient colors={['rgba(244,114,182,0.12)', 'rgba(244,114,182,0.03)']} style={styles.actionGradient}>
                  <View style={[styles.actionIconCircle, { backgroundColor: Colors.accentDim }]}>
                    <Heart size={22} color={Colors.accent} />
                  </View>
                  <Text style={styles.actionLabel}>Love{'\n'}Match</Text>
                </LinearGradient>
              </Pressable>
              <Pressable style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.85, transform: [{ scale: 0.96 }] }]} onPress={() => handlePress('/(app)/chat')}>
                <LinearGradient colors={['rgba(167,139,250,0.12)', 'rgba(167,139,250,0.03)']} style={styles.actionGradient}>
                  <View style={[styles.actionIconCircle, { backgroundColor: Colors.purpleDim }]}>
                    <MessageCircle size={22} color={Colors.purpleLight} />
                  </View>
                  <Text style={styles.actionLabel}>Ask an{'\n'}Astrologer</Text>
                </LinearGradient>
              </Pressable>
            </View>

            {/* Secondary row */}
            <View style={styles.secondaryActions}>
              <Pressable style={({ pressed }) => [styles.secondaryCard, pressed && { opacity: 0.85 }]} onPress={() => handlePress('/(app)/chart')}>
                <GlassCard variant="subtle" style={styles.secondaryInner}>
                  <View style={[styles.secondaryIcon, { backgroundColor: Colors.tealDim }]}>
                    <Compass size={20} color={Colors.teal} />
                  </View>
                  <View style={styles.secondaryText}>
                    <Text style={styles.secondaryTitle}>Natal Chart</Text>
                    <Text style={styles.secondaryDesc}>View your cosmic blueprint</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textMuted} />
                </GlassCard>
              </Pressable>

              <Pressable style={({ pressed }) => [styles.secondaryCard, pressed && { opacity: 0.85 }]} onPress={() => handlePress('/(app)/insights')}>
                <GlassCard variant="subtle" style={styles.secondaryInner}>
                  <View style={[styles.secondaryIcon, { backgroundColor: Colors.blueDim }]}>
                    <BookOpen size={20} color={Colors.blue} />
                  </View>
                  <View style={styles.secondaryText}>
                    <Text style={styles.secondaryTitle}>Cosmic Insights</Text>
                    <Text style={styles.secondaryDesc}>Unlock deep astrological analysis</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textMuted} />
                </GlassCard>
              </Pressable>
            </View>

            {/* Cosmic Tip */}
            <GlassCard variant="glow" glowColor={Colors.gold} style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Star size={16} color={Colors.gold} />
                <Text style={styles.tipTitle}>Cosmic Tip</Text>
              </View>
              <Text style={styles.tipContent}>
                {zodiac
                  ? `As a ${zodiac.name}, today's ${moonPhase.name.toLowerCase()} enhances your ${zodiac.element.toLowerCase()} energy. Stay open to new possibilities and trust your intuition.`
                  : 'Connect with the stars by setting your zodiac sign in your profile.'}
              </Text>
            </GlassCard>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  greeting: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
  userName: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginTop: 2, letterSpacing: -0.5 },
  avatarBtn: {},
  signBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signBadgePlain: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.purpleDim,
    borderWidth: 1.5,
    borderColor: Colors.purpleGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signSymbol: { fontSize: 24, color: '#fff' },

  // Hero Card
  heroCard: { marginBottom: 24, padding: 20 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLabelText: { fontSize: 13, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  moonBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  moonEmoji: { fontSize: 16 },
  moonText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  heroSignRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  heroSignSymbol: { fontSize: 22 },
  heroSignName: { fontSize: 18, fontWeight: '700', color: Colors.purpleLight },
  heroElementBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  heroElementText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroContent: {},
  heroText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  heroPlaceholder: { fontSize: 15, color: Colors.textMuted, lineHeight: 22, fontStyle: 'italic' },
  moreBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  moreCategories: { fontSize: 12, color: Colors.purpleLight, fontWeight: '600' },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, alignSelf: 'flex-end' },
  readMoreText: { fontSize: 13, fontWeight: '600', color: Colors.purpleLight },

  // Quick Actions
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.3 },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 12, justifyContent: 'center' },
  actionCard: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.bgCardBorder },
  actionGradient: { paddingVertical: 18, paddingHorizontal: 14, alignItems: 'flex-start', gap: 12, minHeight: 115 },
  actionIconCircle: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 19 },

  // Secondary Actions
  secondaryActions: { gap: 10, marginBottom: 16 },
  secondaryCard: {},
  secondaryInner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  secondaryIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { flex: 1 },
  secondaryTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  secondaryDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  // Cosmic Tip
  tipCard: { marginBottom: 20 },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  tipContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
});
