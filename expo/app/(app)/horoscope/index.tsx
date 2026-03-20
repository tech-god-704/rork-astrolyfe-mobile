import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Heart, Briefcase, Activity, TrendingUp, Flame, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';

type PeriodType = 'daily' | 'monthly';

interface HoroscopeEntry {
  category: string;
  title: string;
  icon: string;
  content: string;
}

const CATEGORY_CONFIG: Record<string, { color: string; icon: typeof Heart }> = {
  love: { color: Colors.accent, icon: Heart },
  career: { color: Colors.purpleLight, icon: Briefcase },
  health: { color: Colors.teal, icon: Activity },
  general: { color: Colors.gold, icon: Star },
  finance: { color: Colors.success, icon: TrendingUp },
  spiritual: { color: '#A855F7', icon: Flame },
};

export default function HoroscopeScreen() {
  const { profile } = useAuth();
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;
  const [period, setPeriod] = useState<PeriodType>('daily');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const todayStr = new Date().toISOString().split('T')[0];
  const monthStr = new Date().toISOString().slice(0, 7) + '-01';
  const periodDate = period === 'daily' ? todayStr : monthStr;

  const horoscopeQuery = useQuery({
    queryKey: ['horoscopes', profile?.zodiac_sign, period, periodDate],
    queryFn: async () => {
      if (!profile?.zodiac_sign) return [];
      const { data, error } = await supabase
        .from('horoscopes')
        .select('category, title, icon, content')
        .eq('zodiac_sign', profile.zodiac_sign)
        .eq('period_type', period)
        .eq('period_date', periodDate);
      if (error) {
        console.log('[Horoscope] Error:', error.message);
        return [];
      }
      return (data ?? []) as HoroscopeEntry[];
    },
    enabled: !!profile?.zodiac_sign,
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('horoscopes-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'horoscopes' }, () => {
          void horoscopeQuery.refetch();
        })
        .subscribe();
    } catch (e) {
      console.log('[Horoscope] Realtime setup error:', e);
    }
    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const handlePeriodChange = useCallback((p: PeriodType) => {
    if (p === period) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      setPeriod(p);
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [period, fadeAnim]);

  const entries = horoscopeQuery.data ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={horoscopeQuery.isRefetching} onRefresh={() => void horoscopeQuery.refetch()} tintColor={Colors.purple} />}
        >
          {/* Header with zodiac badge */}
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
          </View>

          {/* Period Tabs */}
          <View style={styles.periodTabs}>
            {(['daily', 'monthly'] as PeriodType[]).map((p) => (
              <Pressable
                key={p}
                style={[styles.periodTab, period === p && styles.periodTabActive]}
                onPress={() => handlePeriodChange(p)}
              >
                {period === p && (
                  <LinearGradient
                    colors={[Colors.purple, Colors.indigoLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
                <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                  {p === 'daily' ? 'Daily' : 'Monthly'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Animated.View style={{ opacity: fadeAnim }}>
            {horoscopeQuery.isLoading ? (
              <GlassCard style={styles.loadingCard}>
                <Sparkles size={24} color={Colors.purpleLight} />
                <Text style={styles.loadingText}>Consulting the stars...</Text>
              </GlassCard>
            ) : entries.length > 0 ? (
              entries.map((entry, index) => {
                const cat = entry.category?.toLowerCase() ?? 'general';
                const config = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.general;
                const IconComponent = config.icon;
                return (
                  <GlassCard key={`${entry.category}-${index}`} style={styles.entryCard}>
                    <View style={styles.entryHeader}>
                      <View style={[styles.categoryIconCircle, { backgroundColor: `${config.color}15` }]}>
                        <IconComponent size={18} color={config.color} />
                      </View>
                      <Text style={[styles.entryCategory, { color: config.color }]}>
                        {entry.title || entry.category}
                      </Text>
                    </View>
                    <Text style={styles.entryContent}>{entry.content}</Text>
                    {/* Accent line */}
                    <View style={[styles.accentLine, { backgroundColor: config.color }]} />
                  </GlassCard>
                );
              })
            ) : (
              <GlassCard style={styles.emptyCard}>
                <View style={styles.emptyIconWrap}>
                  <Sparkles size={36} color={Colors.textMuted} />
                </View>
                <Text style={styles.emptyTitle}>No {period} reading available</Text>
                <Text style={styles.emptyDesc}>
                  {period === 'daily'
                    ? 'Your astrologer is preparing today\'s reading. Check back soon!'
                    : 'Monthly readings are published at the start of each month.'}
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

  header: { marginTop: 8, marginBottom: 20 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  signRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  signSymbol: { fontSize: 20 },
  signLabel: { fontSize: 16, color: Colors.purpleLight, fontWeight: '700' },
  elementBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  elementText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  periodTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  periodTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, overflow: 'hidden' },
  periodTabActive: {},
  periodTabText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
  periodTabTextActive: { color: '#fff' },

  loadingCard: { alignItems: 'center', paddingVertical: 50, gap: 16 },
  loadingText: { fontSize: 15, color: Colors.textMuted, fontStyle: 'italic' },

  entryCard: { marginBottom: 14, overflow: 'hidden' },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  categoryIconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  entryCategory: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  entryContent: { fontSize: 15, color: Colors.textSecondary, lineHeight: 24 },
  accentLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: 2 },

  emptyCard: { alignItems: 'center', paddingVertical: 50, gap: 14 },
  emptyIconWrap: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 21, paddingHorizontal: 20 },
});
