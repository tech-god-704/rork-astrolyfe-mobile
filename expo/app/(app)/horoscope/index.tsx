import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Heart, Briefcase, Activity, TrendingUp, Flame, Star, Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { getZodiacByName, getMoonPhase } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { getHoroscope, fetchCuratedHoroscope, categorizeHoroscope, type HoroscopePeriod } from '@/services/horoscope';
import AppBackground from '@/components/AppBackground';

type PeriodType = HoroscopePeriod;

const CATEGORY_CONFIG: Record<string, { color: string; Icon: typeof Heart }> = {
  love: { color: Colors.accent, Icon: Heart },
  career: { color: Colors.purpleLight, Icon: Briefcase },
  health: { color: Colors.teal, Icon: Activity },
  general: { color: Colors.gold, Icon: Star },
  finance: { color: Colors.success, Icon: TrendingUp },
  spiritual: { color: '#A855F7', Icon: Flame },
};

const PERIOD_LABELS: { key: PeriodType; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export default function HoroscopeScreen() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;
  const moonPhase = getMoonPhase();
  const [period, setPeriod] = useState<PeriodType>('daily');
  const [refreshing, setRefreshing] = useState(false);
  const contentAnim = useRef(new Animated.Value(1)).current;

  // Try curated horoscope from Supabase (written by the web app), fall back to local
  const signName = profile?.zodiac_sign || 'Aries';
  const todayKey = new Date().toDateString(); // auto-invalidate at midnight
  const localReading = useMemo(() => getHoroscope(signName, period), [signName, period]);

  const curatedQuery = useQuery({
    queryKey: ['curatedHoroscope', signName, period, todayKey],
    queryFn: () => fetchCuratedHoroscope(signName, period),
    staleTime: 1000 * 60 * 30, // 30 min — curated content changes infrequently
  });

  const activeReading = curatedQuery.data ?? localReading;
  const displayText = activeReading.horoscope;
  const displayCategories = useMemo(
    () => categorizeHoroscope(activeReading),
    [activeReading]
  );

  // Fade in content whenever period changes
  useEffect(() => {
    contentAnim.setValue(0);
    Animated.timing(contentAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [period]);

  const handlePeriodChange = useCallback((p: PeriodType) => {
    if (p === period) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPeriod(p);
  }, [period]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['curatedHoroscope', signName, period] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, signName, period]);

  const getPeriodLabel = () => {
    const now = new Date();
    switch (period) {
      case 'daily': {
        return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      }
      case 'weekly': return 'This Week\'s Forecast';
      case 'monthly': return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
        >
          {/* Header with zodiac info */}
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>YOUR PERSONAL FORECAST</Text>
              <Text style={styles.title}>The sky ahead</Text>
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
            {PERIOD_LABELS.map(({ key, label }) => (
              <Pressable
                key={key}
                style={[styles.periodTab, period === key && styles.periodTabActive]}
                onPress={() => handlePeriodChange(key)}
              >
                {period === key && (
                  <View style={styles.periodActiveRule} />
                )}
                <Text style={[styles.periodTabText, period === key && styles.periodTabTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Date label */}
          <View style={styles.dateRow}>
            <Sun size={13} color={Colors.gold} />
            <Text style={styles.dateText}>{getPeriodLabel()}</Text>
          </View>

          <Animated.View style={{ opacity: contentAnim, transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
            {/* Full reading card */}
            <GlassCard variant="elevated" style={styles.fullReadingCard}>
              <LinearGradient
                colors={['rgba(97,56,163,0.16)', 'rgba(59,81,196,0.06)', 'transparent']}
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
              {zodiac && (
                <View style={styles.readingSignRow}>
                  <Text style={styles.readingSignSymbol}>{zodiac.symbol}</Text>
                  <Text style={styles.readingSignName}>{zodiac.name}</Text>
                </View>
              )}
              <Text style={styles.fullReadingText}>{displayText}</Text>
            </GlassCard>

            {/* Category breakdown */}
            {displayCategories.length > 1 && (
              <Text style={styles.sectionLabel}>Detailed Insights</Text>
            )}
            {displayCategories.map((entry, index) => {
              const cat = entry.category?.toLowerCase() || 'general';
              const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
              const IconComponent = config.Icon;

              return (
                <GlassCard key={`${cat}-${index}`} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={[styles.categoryIconCircle, { backgroundColor: `${config.color}18` }]}>
                      <IconComponent size={18} color={config.color} />
                    </View>
                    <Text style={[styles.entryCategory, { color: config.color }]}>
                      {entry.title}
                    </Text>
                  </View>
                  <Text style={styles.entryContent}>{entry.content}</Text>
                  <View style={[styles.accentLine, { backgroundColor: config.color }]} />
                </GlassCard>
              );
            })}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },

  header: { marginTop: 8, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  eyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginBottom: 6 },
  title: { fontSize: 34, fontFamily: Fonts.display, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.6 },
  signRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  signSymbol: { fontSize: 20 },
  signLabel: { fontSize: 16, color: Colors.purpleLight, fontWeight: '700' },
  elementBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  elementText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  moonInfo: { alignItems: 'center', marginTop: 4, flexShrink: 0 },
  moonEmoji: { fontSize: 24 },
  moonName: { fontSize: 10, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },

  periodTabs: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 0,
    padding: 0,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgCardBorder,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 0,
    overflow: 'hidden',
  },
  periodActiveRule: { position: 'absolute', left: 20, right: 20, bottom: 0, height: 2, borderRadius: 1, backgroundColor: Colors.gold },
  periodTabActive: {},
  periodTabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  periodTabTextActive: { color: Colors.textPrimary },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  dateText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  fullReadingCard: { marginBottom: 24, padding: 22, backgroundColor: Colors.paper, borderColor: 'rgba(192,154,235,0.26)' },
  fullReadingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  fullReadingTitle: { fontSize: 12, fontWeight: '800', color: Colors.paperInk, textTransform: 'uppercase', letterSpacing: 1.1 },
  readingSignRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  readingSignSymbol: { fontSize: 22 },
  readingSignName: { fontSize: 18, fontWeight: '700', color: Colors.purpleDeep },
  fullReadingText: { fontSize: 17, fontFamily: Fonts.display, color: Colors.paperInk, lineHeight: 29 },

  sectionLabel: { fontSize: 22, fontFamily: Fonts.display, fontWeight: '600', color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.2 },

  entryCard: { marginBottom: 14, overflow: 'hidden' },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  categoryIconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryCategory: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  entryContent: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  accentLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
});
