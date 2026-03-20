import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Heart, Briefcase, Activity, TrendingUp, Flame, Star, Calendar, Clock, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { getZodiacByName, getMoonPhase } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { fetchHoroscope, categorizeHoroscope, type HoroscopePeriod, type CategorizedReading } from '@/services/horoscope';

type PeriodType = HoroscopePeriod;

const CATEGORY_CONFIG: Record<string, { color: string; Icon: typeof Heart }> = {
  love: { color: Colors.accent, Icon: Heart },
  career: { color: Colors.purpleLight, Icon: Briefcase },
  health: { color: Colors.teal, Icon: Activity },
  general: { color: Colors.gold, Icon: Star },
  finance: { color: Colors.success, Icon: TrendingUp },
  spiritual: { color: '#A855F7', Icon: Flame },
};

const PERIOD_CONFIG: { key: PeriodType; label: string; Icon: typeof Clock }[] = [
  { key: 'daily', label: 'Daily', Icon: Clock },
  { key: 'weekly', label: 'Weekly', Icon: Calendar },
  { key: 'monthly', label: 'Monthly', Icon: Moon },
];

export default function HoroscopeScreen() {
  const { profile } = useAuth();
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;
  const moonPhase = getMoonPhase();
  const [period, setPeriod] = useState<PeriodType>('daily');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const todayStr = new Date().toISOString().split('T')[0];

  // Entry stagger animations
  const entryAnims = useRef<Animated.Value[]>([]);

  const horoscopeQuery = useQuery({
    queryKey: ['horoscopeReading', profile?.zodiac_sign, period, todayStr],
    queryFn: async () => {
      if (!profile?.zodiac_sign) return null;
      const reading = await fetchHoroscope(profile.zodiac_sign, period);
      const categories = categorizeHoroscope(reading);
      return { reading, categories };
    },
    enabled: !!profile?.zodiac_sign,
    staleTime: 1000 * 60 * 15, // 15 min cache
    gcTime: 1000 * 60 * 60,
  });

  const entries = horoscopeQuery.data?.categories ?? [];
  const readingDate = horoscopeQuery.data?.reading?.date;

  // Animate entries when data changes
  useEffect(() => {
    if (entries.length > 0) {
      // Create/reset animations for each entry
      entryAnims.current = entries.map(() => new Animated.Value(0));
      const animations = entryAnims.current.map((anim, i) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 350,
          delay: i * 80,
          useNativeDriver: true,
        })
      );
      Animated.stagger(80, animations).start();
    }
  }, [entries.length, period]);

  const handlePeriodChange = useCallback((p: PeriodType) => {
    if (p === period) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setPeriod(p);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }, [period, fadeAnim]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'daily': return formatDate(readingDate) || 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={horoscopeQuery.isRefetching} onRefresh={() => void horoscopeQuery.refetch()} tintColor={Colors.purple} />}
        >
          {/* Header with zodiac info */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Horoscope</Text>
              {zodiac && (
                <View style={styles.signRow}>
                  <Text style={styles.signSymbol}>{zodiac.symbol}</Text>
                  <Text style={styles.signLabel}>{zodiac.name}</Text>
                  <View style={[styles.elementBadge, { backgroundColor: `${zodiac.color}15` }]}>
                    <Text style={[styles.elementText, { color: zodiac.color }]}>{zodiac.element}</Text>
                  </View>
                </View>
              )}
            </View>
            <View style={styles.moonInfo}>
              <Text style={styles.moonEmoji}>{moonPhase.emoji}</Text>
              <Text style={styles.moonName}>{moonPhase.name}</Text>
            </View>
          </View>

          {/* Period Tabs */}
          <View style={styles.periodTabs}>
            {PERIOD_CONFIG.map(({ key, label, Icon }) => (
              <Pressable
                key={key}
                style={[styles.periodTab, period === key && styles.periodTabActive]}
                onPress={() => handlePeriodChange(key)}
              >
                {period === key && (
                  <LinearGradient
                    colors={[Colors.purple, Colors.indigoLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
                <Icon size={14} color={period === key ? '#fff' : Colors.textMuted} />
                <Text style={[styles.periodTabText, period === key && styles.periodTabTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Period date label */}
          {entries.length > 0 && (
            <View style={styles.dateRow}>
              <Calendar size={13} color={Colors.textMuted} />
              <Text style={styles.dateText}>{getPeriodLabel()}</Text>
            </View>
          )}

          <Animated.View style={{ opacity: fadeAnim }}>
            {horoscopeQuery.isLoading ? (
              <GlassCard style={styles.loadingCard}>
                <View style={styles.loadingPulse}>
                  <Sparkles size={28} color={Colors.purpleLight} />
                </View>
                <Text style={styles.loadingText}>Consulting the stars...</Text>
                <Text style={styles.loadingSubtext}>Reading cosmic energies for your sign</Text>
              </GlassCard>
            ) : entries.length > 0 ? (
              <>
                {/* Full reading card at top */}
                <GlassCard variant="elevated" style={styles.fullReadingCard}>
                  <LinearGradient
                    colors={['rgba(124,58,237,0.1)', 'rgba(99,102,241,0.05)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.fullReadingHeader}>
                    <Sparkles size={16} color={Colors.gold} />
                    <Text style={styles.fullReadingTitle}>
                      {period === 'daily' ? 'Your Daily Reading' : period === 'weekly' ? 'Your Weekly Outlook' : 'Your Monthly Forecast'}
                    </Text>
                  </View>
                  <Text style={styles.fullReadingText}>
                    {horoscopeQuery.data?.reading?.horoscope}
                  </Text>
                </GlassCard>

                {/* Category breakdown */}
                {entries.length > 1 && (
                  <Text style={styles.sectionLabel}>Detailed Insights</Text>
                )}
                {entries.map((entry, index) => {
                  const cat = entry.category?.toLowerCase() ?? 'general';
                  const config = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.general;
                  const IconComponent = config.Icon;
                  const animValue = entryAnims.current[index];

                  return (
                    <Animated.View
                      key={`${entry.category}-${index}`}
                      style={animValue ? {
                        opacity: animValue,
                        transform: [{
                          translateY: animValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: [20, 0],
                          }),
                        }],
                      } : undefined}
                    >
                      <GlassCard style={styles.entryCard}>
                        <View style={styles.entryHeader}>
                          <View style={[styles.categoryIconCircle, { backgroundColor: `${config.color}18` }]}>
                            <IconComponent size={18} color={config.color} />
                          </View>
                          <View style={styles.entryTitleWrap}>
                            <Text style={[styles.entryCategory, { color: config.color }]}>
                              {entry.title}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.entryContent}>{entry.content}</Text>
                        {/* Accent line */}
                        <View style={[styles.accentLine, { backgroundColor: config.color }]} />
                      </GlassCard>
                    </Animated.View>
                  );
                })}
              </>
            ) : (
              <GlassCard style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Sparkles size={36} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>
                  {!profile?.zodiac_sign ? 'Set Your Sign' : 'Reading Unavailable'}
                </Text>
                <Text style={styles.emptyDesc}>
                  {!profile?.zodiac_sign
                    ? 'Select your zodiac sign in your profile to receive personalized horoscope readings.'
                    : 'We couldn\'t load your reading right now. Pull down to try again.'}
                </Text>
              </GlassCard>
            )}
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

  header: { marginTop: 8, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  signRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  signSymbol: { fontSize: 20 },
  signLabel: { fontSize: 16, color: Colors.purpleLight, fontWeight: '700' },
  elementBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  elementText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  moonInfo: { alignItems: 'center', marginTop: 4 },
  moonEmoji: { fontSize: 24 },
  moonName: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },

  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  periodTabActive: {},
  periodTabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  periodTabTextActive: { color: '#fff' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  dateText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  // Full reading card
  fullReadingCard: { marginBottom: 20, padding: 20 },
  fullReadingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  fullReadingTitle: { fontSize: 15, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  fullReadingText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 26 },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12, letterSpacing: -0.2 },

  loadingCard: { alignItems: 'center', paddingVertical: 60, gap: 14 },
  loadingPulse: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.purpleDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { fontSize: 17, color: Colors.textPrimary, fontWeight: '600' },
  loadingSubtext: { fontSize: 13, color: Colors.textMuted },

  entryCard: { marginBottom: 14, overflow: 'hidden' },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  categoryIconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryTitleWrap: { flex: 1 },
  entryCategory: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  entryContent: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  accentLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },

  emptyCard: { alignItems: 'center', paddingVertical: 50, gap: 14 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 },
});
