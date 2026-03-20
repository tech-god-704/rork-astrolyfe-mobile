import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react-native';
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

const CATEGORY_COLORS: Record<string, string> = {
  love: Colors.accent,
  career: Colors.purpleLight,
  health: Colors.teal,
  general: Colors.gold,
  finance: Colors.success,
  spiritual: '#A855F7',
};

export default function HoroscopeScreen() {
  const { profile } = useAuth();
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;
  const [period, setPeriod] = useState<PeriodType>('daily');

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPeriod(p);
  }, []);

  const entries = horoscopeQuery.data ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={horoscopeQuery.isRefetching} onRefresh={() => void horoscopeQuery.refetch()} tintColor={Colors.purple} />}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Horoscope</Text>
            {zodiac && <Text style={styles.signLabel}>{zodiac.symbol} {zodiac.name}</Text>}
          </View>

          <View style={styles.periodTabs}>
            <Pressable
              style={[styles.periodTab, period === 'daily' && styles.periodTabActive]}
              onPress={() => handlePeriodChange('daily')}
            >
              <Text style={[styles.periodTabText, period === 'daily' && styles.periodTabTextActive]}>Daily</Text>
            </Pressable>
            <Pressable
              style={[styles.periodTab, period === 'monthly' && styles.periodTabActive]}
              onPress={() => handlePeriodChange('monthly')}
            >
              <Text style={[styles.periodTabText, period === 'monthly' && styles.periodTabTextActive]}>Monthly</Text>
            </Pressable>
          </View>

          {horoscopeQuery.isLoading ? (
            <GlassCard style={styles.loadingCard}>
              <Text style={styles.loadingText}>Loading your {period} reading...</Text>
            </GlassCard>
          ) : entries.length > 0 ? (
            entries.map((entry, index) => {
              const color = CATEGORY_COLORS[entry.category?.toLowerCase()] ?? Colors.gold;
              return (
                <GlassCard key={`${entry.category}-${index}`} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <View style={[styles.categoryDot, { backgroundColor: color }]} />
                    <Text style={[styles.entryCategory, { color }]}>
                      {entry.icon ? `${entry.icon} ` : ''}{entry.title || entry.category}
                    </Text>
                  </View>
                  <Text style={styles.entryContent}>{entry.content}</Text>
                </GlassCard>
              );
            })
          ) : (
            <GlassCard style={styles.emptyCard}>
              <Sparkles size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No {period} reading available</Text>
              <Text style={styles.emptyDesc}>
                {period === 'daily'
                  ? 'Your astrologer is preparing today\'s reading. Check back soon!'
                  : 'Monthly readings are published at the start of each month.'}
              </Text>
            </GlassCard>
          )}
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
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary },
  signLabel: { fontSize: 16, color: Colors.purpleLight, marginTop: 4, fontWeight: '600' },
  periodTabs: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: 14, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: Colors.bgCardBorder },
  periodTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  periodTabActive: { backgroundColor: Colors.purple },
  periodTabText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
  periodTabTextActive: { color: '#fff' },
  loadingCard: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 15, color: Colors.textMuted, fontStyle: 'italic' },
  entryCard: { marginBottom: 16 },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  categoryDot: { width: 8, height: 8, borderRadius: 4 },
  entryCategory: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  entryContent: { fontSize: 15, color: Colors.textSecondary, lineHeight: 23 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
});
