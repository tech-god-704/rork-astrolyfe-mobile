import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Heart, Briefcase, Activity, TrendingUp, Flame, Star, Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { getZodiacByName, getMoonPhase } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { getHoroscope, categorizeHoroscope, fetchLiveHoroscope, type HoroscopePeriod } from '@/services/horoscope';

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
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;
  const moonPhase = getMoonPhase();
  const [period, setPeriod] = useState<PeriodType>('daily');
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [liveText, setLiveText] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Generate content INSTANTLY — no network, no async, no loading
  const signName = profile?.zodiac_sign || 'Aries';
  const localReading = useMemo(() => getHoroscope(signName, period), [signName, period]);

  // Use live API text if available, otherwise local
  const displayText = liveText || localReading.horoscope;
  const displayCategories = useMemo(
    () => categorizeHoroscope({ ...localReading, horoscope: displayText }),
    [localReading, displayText]
  );

  // Try fetching live data in background (non-blocking)
  useEffect(() => {
    setLiveText(null); // Reset when period/sign changes
    let cancelled = false;

    fetchLiveHoroscope(signName, period).then((result) => {
      if (!cancelled && result?.horoscope) {
        setLiveText(result.horoscope);
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [signName, period]);

  // Stagger animations for entry cards
  const entryAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    entryAnims.current = displayCategories.map(() => new Animated.Value(0));
    const animations = entryAnims.current.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 350,
        delay: i * 100,
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, animations).start();
  }, [displayCategories.length, period, liveText]);

  const handlePeriodChange = useCallback((p: PeriodType) => {
    if (p === period) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setPeriod(p);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [period, fadeAnim]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setLiveText(null);
    fetchLiveHoroscope(signName, period).then((result) => {
      if (result?.horoscope) setLiveText(result.horoscope);
      setRefreshing(false);
    }).catch(() => setRefreshing(false));
  }, [signName, period]);

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
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.purple} />}
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
            {PERIOD_LABELS.map(({ key, label }) => (
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

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Full reading card */}
            <GlassCard variant="elevated" style={styles.fullReadingCard}>
              <LinearGradient
                colors={['rgba(124,58,237,0.12)', 'rgba(99,102,241,0.06)', 'transparent']}
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
              const animValue = entryAnims.current[index];

              return (
                <Animated.View
                  key={`${cat}-${index}`}
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
                      <Text style={[styles.entryCategory, { color: config.color }]}>
                        {entry.title}
                      </Text>
                    </View>
                    <Text style={styles.entryContent}>{entry.content}</Text>
                    <View style={[styles.accentLine, { backgroundColor: config.color }]} />
                  </GlassCard>
                </Animated.View>
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
  },
  periodTabActive: {},
  periodTabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  periodTabTextActive: { color: '#fff' },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  dateText: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  fullReadingCard: { marginBottom: 20, padding: 20 },
  fullReadingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  fullReadingTitle: { fontSize: 14, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.6 },
  readingSignRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  readingSignSymbol: { fontSize: 22 },
  readingSignName: { fontSize: 18, fontWeight: '700', color: Colors.purpleLight },
  fullReadingText: { fontSize: 15, color: Colors.textSecondary, lineHeight: 26 },

  sectionLabel: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14, letterSpacing: -0.2 },

  entryCard: { marginBottom: 14, overflow: 'hidden' },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  categoryIconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryCategory: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  entryContent: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  accentLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },
});
