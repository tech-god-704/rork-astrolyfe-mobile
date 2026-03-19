import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';

export default function HoroscopeScreen() {
  const { profile, user } = useAuth();
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;
  const todayStr = new Date().toISOString().split('T')[0];

  const horoscopeQuery = useQuery({
    queryKey: ['horoscope', user?.email, todayStr],
    queryFn: async () => {
      if (!user?.email) return null;
      console.log('[Horoscope] Fetching entries');
      const { data, error } = await supabase
        .from('horoscope_entries')
        .select('*')
        .eq('user_email', user.email)
        .order('date', { ascending: false })
        .limit(7);
      if (error) { console.log('[Horoscope] Error:', error.message); return []; }
      return data ?? [];
    },
    enabled: !!user?.email,
  });

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel('horoscope-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'horoscope_entries' }, () => {
          console.log('[Horoscope] Realtime update received');
          void horoscopeQuery.refetch();
        })
        .subscribe();
    } catch (e) {
      console.log('[Horoscope] Realtime setup error:', e);
    }
    return () => {
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [horoscopeQuery]);

  const entries = horoscopeQuery.data ?? [];
  const todayEntry = entries.find((e: { date: string }) => e.date === todayStr);

  const energyMeters = [
    { label: 'Love', value: 0.7, color: Colors.accent },
    { label: 'Career', value: 0.85, color: Colors.purpleLight },
    { label: 'Health', value: 0.6, color: Colors.teal },
    { label: 'Luck', value: 0.9, color: Colors.gold },
  ];

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
            <Text style={styles.title}>Daily Horoscope</Text>
            {zodiac && <Text style={styles.signLabel}>{zodiac.symbol} {zodiac.name}</Text>}
          </View>

          <GlassCard style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Sparkles size={20} color={Colors.gold} />
              <Text style={styles.todayTitle}>Today's Reading</Text>
              <Text style={styles.todayDate}>{todayStr}</Text>
            </View>
            {todayEntry ? (
              <Text style={styles.todayContent}>{todayEntry.content}</Text>
            ) : (
              <Text style={styles.noContent}>
                {horoscopeQuery.isLoading ? 'Loading...' : 'No horoscope available for today yet. Your astrologer is preparing your reading.'}
              </Text>
            )}
          </GlassCard>

          <Text style={styles.sectionTitle}>Energy Meters</Text>
          <GlassCard style={styles.metersCard}>
            {energyMeters.map((meter) => (
              <View key={meter.label} style={styles.meterRow}>
                <Text style={styles.meterLabel}>{meter.label}</Text>
                <View style={styles.meterTrack}>
                  <View style={[styles.meterFill, { width: `${meter.value * 100}%`, backgroundColor: meter.color }]} />
                </View>
                <Text style={[styles.meterValue, { color: meter.color }]}>{Math.round(meter.value * 100)}%</Text>
              </View>
            ))}
          </GlassCard>

          {entries.length > 1 && (
            <>
              <Text style={styles.sectionTitle}>Recent Readings</Text>
              {entries.filter((e: { date: string }) => e.date !== todayStr).map((entry: { id: string; date: string; content: string }) => (
                <GlassCard key={entry.id} style={styles.pastCard}>
                  <Text style={styles.pastDate}>{entry.date}</Text>
                  <Text style={styles.pastContent} numberOfLines={3}>{entry.content}</Text>
                </GlassCard>
              ))}
            </>
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
  header: { marginTop: 8, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800' as const, color: Colors.textPrimary },
  signLabel: { fontSize: 16, color: Colors.purpleLight, marginTop: 4, fontWeight: '600' as const },
  todayCard: { marginBottom: 24 },
  todayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  todayTitle: { fontSize: 17, fontWeight: '700' as const, color: Colors.textPrimary, flex: 1 },
  todayDate: { fontSize: 13, color: Colors.textMuted },
  todayContent: { fontSize: 16, color: Colors.textSecondary, lineHeight: 24 },
  noContent: { fontSize: 15, color: Colors.textMuted, fontStyle: 'italic' as const, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700' as const, color: Colors.textPrimary, marginBottom: 14 },
  metersCard: { marginBottom: 24, gap: 16 },
  meterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meterLabel: { fontSize: 14, color: Colors.textSecondary, width: 55 },
  meterTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' },
  meterFill: { height: 8, borderRadius: 4 },
  meterValue: { fontSize: 13, fontWeight: '700' as const, width: 40, textAlign: 'right' as const },
  pastCard: { marginBottom: 12 },
  pastDate: { fontSize: 13, color: Colors.textMuted, marginBottom: 6, fontWeight: '600' as const },
  pastContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
