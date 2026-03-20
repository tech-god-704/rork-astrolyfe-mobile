import React, { useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Sun, MessageCircle, Heart, Sparkles, BookOpen, Compass, ChevronRight, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getZodiacByName, getMoonPhase } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';

const { width: SCREEN_W } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const moonPhase = getMoonPhase();
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;

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

  const todayStr = new Date().toISOString().split('T')[0];

  const horoscopeQuery = useQuery({
    queryKey: ['todayHoroscope', profile?.zodiac_sign, todayStr],
    queryFn: async () => {
      if (!profile?.zodiac_sign) return null;
      const { data, error } = await supabase
        .from('horoscopes')
        .select('category, title, icon, content')
        .eq('zodiac_sign', profile.zodiac_sign)
        .eq('period_type', 'daily')
        .eq('period_date', todayStr);
      if (error) {
        console.log('[Home] Horoscope fetch error:', error.message);
        return null;
      }
      return data && data.length > 0 ? data : null;
    },
    enabled: !!profile?.zodiac_sign,
  });

  const onRefresh = useCallback(() => {
    void horoscopeQuery.refetch();
  }, [horoscopeQuery]);

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

  const horoscopes = horoscopeQuery.data;
  const firstHoroscope = horoscopes?.[0];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={horoscopeQuery.isRefetching} onRefresh={onRefresh} tintColor={Colors.purple} />}
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

                {firstHoroscope ? (
                  <View style={styles.heroContent}>
                    <Text style={styles.heroCategory}>
                      {firstHoroscope.icon ? `${firstHoroscope.icon} ` : ''}{firstHoroscope.title || firstHoroscope.category}
                    </Text>
                    <Text style={styles.heroText} numberOfLines={3}>{firstHoroscope.content}</Text>
                    {horoscopes && horoscopes.length > 1 && (
                      <Text style={styles.moreCategories}>+{horoscopes.length - 1} more categories</Text>
                    )}
                  </View>
                ) : (
                  <Text style={styles.heroPlaceholder}>
                    {horoscopeQuery.isLoading ? 'Consulting the stars...' : 'Your reading is being prepared. Check back soon!'}
                  </Text>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  greeting: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
  userName: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginTop: 2, letterSpacing: -0.5 },
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
  heroCard: { marginBottom: 28, padding: 22 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroLabelText: { fontSize: 13, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.8 },
  moonBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  moonEmoji: { fontSize: 16 },
  moonText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  heroContent: {},
  heroCategory: { fontSize: 14, fontWeight: '600', color: Colors.purpleLight, marginBottom: 8 },
  heroText: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24 },
  heroPlaceholder: { fontSize: 15, color: Colors.textMuted, lineHeight: 22, fontStyle: 'italic' },
  moreCategories: { fontSize: 12, color: Colors.textMuted, marginTop: 8 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, alignSelf: 'flex-end' },
  readMoreText: { fontSize: 13, fontWeight: '600', color: Colors.purpleLight },

  // Quick Actions
  sectionTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.3 },
  quickActions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  actionCard: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: Colors.bgCardBorder },
  actionGradient: { paddingVertical: 20, paddingHorizontal: 14, alignItems: 'flex-start', gap: 14, minHeight: 120 },
  actionIconCircle: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 19 },

  // Secondary Actions
  secondaryActions: { gap: 10, marginBottom: 20 },
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
