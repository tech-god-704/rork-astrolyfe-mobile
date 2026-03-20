import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Sun, MessageCircle, Heart, Sparkles, BookOpen } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { getZodiacByName, getMoonPhase } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const moonPhase = getMoonPhase();
  const zodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;

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
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={horoscopeQuery.isRefetching} onRefresh={onRefresh} tintColor={Colors.purple} />}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.userName}>{profile?.display_name || 'Stargazer'}</Text>
            </View>
            {zodiac && (
              <View style={styles.signBadge}>
                <Text style={styles.signSymbol}>{zodiac.symbol}</Text>
              </View>
            )}
          </View>

          <GlassCard style={styles.moonCard}>
            <View style={styles.moonRow}>
              <Text style={styles.moonEmoji}>{moonPhase.emoji}</Text>
              <View>
                <Text style={styles.moonPhase}>{moonPhase.name}</Text>
                <Text style={styles.moonLabel}>Current Moon Phase</Text>
              </View>
            </View>
          </GlassCard>

          <GlassCard style={styles.horoscopeCard}>
            <View style={styles.horoscopeHeader}>
              <Sparkles size={20} color={Colors.gold} />
              <Text style={styles.horoscopeTitle}>Today's Horoscope</Text>
            </View>
            {firstHoroscope ? (
              <View>
                <Text style={styles.horoscopeCategory}>
                  {firstHoroscope.icon ? `${firstHoroscope.icon} ` : ''}{firstHoroscope.title || firstHoroscope.category}
                </Text>
                <Text style={styles.horoscopeContent} numberOfLines={4}>
                  {firstHoroscope.content}
                </Text>
                {horoscopes && horoscopes.length > 1 && (
                  <Text style={styles.moreCategories}>
                    +{horoscopes.length - 1} more categories
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.horoscopePlaceholder}>
                {horoscopeQuery.isLoading ? 'Loading your reading...' : 'No reading available yet for today. Check back soon!'}
              </Text>
            )}
            <Pressable
              style={({ pressed }) => [styles.readMoreBtn, pressed && { opacity: 0.7 }]}
              onPress={() => handlePress('/(app)/horoscope')}
            >
              <Text style={styles.readMoreText}>Read Full Horoscope</Text>
            </Pressable>
          </GlassCard>

          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <Pressable style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => handlePress('/(app)/horoscope')}>
              <LinearGradient colors={['rgba(251,191,36,0.15)', 'rgba(251,191,36,0.05)']} style={styles.actionGradient}>
                <Sun size={28} color={Colors.gold} />
                <Text style={styles.actionLabel}>Daily{'\n'}Reading</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => handlePress('/(app)/compatibility')}>
              <LinearGradient colors={['rgba(244,114,182,0.15)', 'rgba(244,114,182,0.05)']} style={styles.actionGradient}>
                <Heart size={28} color={Colors.accent} />
                <Text style={styles.actionLabel}>Love{'\n'}Match</Text>
              </LinearGradient>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.actionCard, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]} onPress={() => handlePress('/(app)/chat')}>
              <LinearGradient colors={['rgba(129,140,248,0.15)', 'rgba(129,140,248,0.05)']} style={styles.actionGradient}>
                <MessageCircle size={28} color={Colors.purpleLight} />
                <Text style={styles.actionLabel}>Ask an{'\n'}Astrologer</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [pressed && { opacity: 0.8 }]}
            onPress={() => handlePress('/(app)/insights')}
          >
            <GlassCard style={styles.insightsCard}>
              <View style={styles.insightsRow}>
                <BookOpen size={22} color={Colors.teal} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightsTitle}>Cosmic Insights</Text>
                  <Text style={styles.insightsDesc}>Unlock personalized readings and deep astrological analysis</Text>
                </View>
              </View>
            </GlassCard>
          </Pressable>

          <GlassCard style={styles.tipCard}>
            <Text style={styles.tipTitle}>Cosmic Tip</Text>
            <Text style={styles.tipContent}>
              {zodiac ? `As a ${zodiac.name}, today's ${moonPhase.name.toLowerCase()} enhances your ${zodiac.element.toLowerCase()} energy. Stay open to new possibilities.` : 'Connect with the stars by completing your profile with your zodiac sign.'}
            </Text>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 8 },
  greeting: { fontSize: 16, color: Colors.textSecondary },
  userName: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  signBadge: { width: 50, height: 50, borderRadius: 25, backgroundColor: Colors.purpleDim, borderWidth: 1.5, borderColor: Colors.purpleGlow, alignItems: 'center', justifyContent: 'center' },
  signSymbol: { fontSize: 24 },
  moonCard: { marginBottom: 16 },
  moonRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  moonEmoji: { fontSize: 40 },
  moonPhase: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  moonLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  horoscopeCard: { marginBottom: 24 },
  horoscopeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  horoscopeTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  horoscopeCategory: { fontSize: 14, fontWeight: '600', color: Colors.purpleLight, marginBottom: 6 },
  horoscopeContent: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  horoscopePlaceholder: { fontSize: 15, color: Colors.textMuted, lineHeight: 22, fontStyle: 'italic' },
  moreCategories: { fontSize: 13, color: Colors.textMuted, marginTop: 8 },
  readMoreBtn: { marginTop: 14, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.purpleDim, borderRadius: 10 },
  readMoreText: { fontSize: 13, fontWeight: '600', color: Colors.purpleLight },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.bgCardBorder },
  actionGradient: { paddingVertical: 20, paddingHorizontal: 14, alignItems: 'flex-start', gap: 12, minHeight: 110 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 19 },
  insightsCard: { marginBottom: 24 },
  insightsRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  insightsTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  insightsDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  tipCard: { marginBottom: 20 },
  tipTitle: { fontSize: 15, fontWeight: '700', color: Colors.gold, marginBottom: 8 },
  tipContent: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
