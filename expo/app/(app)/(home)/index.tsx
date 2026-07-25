import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, ChevronRight, Compass, Heart, MessageCircle, Sparkles, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { getMoonPhase, getZodiacByName } from '@/constants/zodiac';
import { categorizeHoroscope, fetchCuratedHoroscope, getHoroscope } from '@/services/horoscope';
import AppBackground from '@/components/AppBackground';
import GlassCard from '@/components/GlassCard';

const SIGNAL_COLORS: Record<string, string> = {
  general: Colors.gold,
  love: Colors.accent,
  career: Colors.teal,
  health: Colors.success,
};

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [promptDismissed, setPromptDismissed] = useState(false);
  const reveal = useRef(new Animated.Value(0)).current;

  const signName = profile?.zodiac_sign || 'Aries';
  const zodiac = getZodiacByName(signName);
  const moonPhase = getMoonPhase();
  const todayKey = new Date().toDateString();
  const localReading = useMemo(() => getHoroscope(signName, 'daily'), [signName]);
  const curatedQuery = useQuery({
    queryKey: ['curatedHoroscope', signName, 'daily', todayKey],
    queryFn: () => fetchCuratedHoroscope(signName, 'daily'),
    staleTime: 1000 * 60 * 30,
  });
  const activeReading = curatedQuery.data ?? localReading;
  const categories = useMemo(() => categorizeHoroscope(activeReading), [activeReading]);

  const profileMissing = useMemo(() => {
    if (!profile) return null;
    const missing: string[] = [];
    if (!profile.birth_date) missing.push('birth date');
    if (profile.quiz_data?.birth_hour == null) missing.push('birth time');
    if (!profile.birth_lat || !profile.birth_lon) missing.push('birth place');
    return missing.length ? missing : null;
  }, [profile]);

  useEffect(() => {
    Animated.timing(reveal, { toValue: 1, duration: 460, useNativeDriver: true }).start();
  }, [reveal]);

  const navigate = useCallback((route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push(route as never);
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['curatedHoroscope'] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const date = new Date();
  const dateLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const lead = categories[0]?.content ?? activeReading.horoscope;

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
        >
          <Animated.View
            style={{
              opacity: reveal,
              transform: [{ translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            }}
          >
            <View style={styles.masthead}>
              <View>
                <Text style={styles.date}>{dateLabel.toUpperCase()}</Text>
                <Text style={styles.edition}>TODAY&apos;S PERSONAL EDITION</Text>
              </View>
              <Pressable style={styles.profileButton} onPress={() => navigate('/(app)/profile')} accessibilityLabel="Open your profile">
                <Text style={styles.profileGlyph}>{zodiac?.symbol ?? '✦'}</Text>
              </Pressable>
            </View>

            <View style={styles.intro}>
              <Text style={styles.greeting}>Good {date.getHours() < 12 ? 'morning' : date.getHours() < 18 ? 'afternoon' : 'evening'},</Text>
              <Text style={styles.name}>{profile?.display_name || 'Stargazer'}.</Text>
            </View>

            <Pressable onPress={() => navigate('/(app)/horoscope')} style={({ pressed }) => [styles.leadCard, pressed && styles.pressed]}>
              <View style={styles.leadTop}>
                <View>
                  <Text style={styles.leadKicker}>THE DAY AHEAD</Text>
                  <Text style={styles.leadMeta}>{zodiac?.name ?? signName} · {moonPhase.name}</Text>
                </View>
                <Text style={styles.moon}>{moonPhase.emoji}</Text>
              </View>
              {curatedQuery.isLoading && (
                <View style={styles.loading}>
                  <ActivityIndicator size="small" color={Colors.paperInk} />
                  <Text style={styles.loadingText}>Refining today&apos;s note…</Text>
                </View>
              )}
              <Text style={styles.leadQuote}>“{lead}”</Text>
              <View style={styles.leadFooter}>
                <Text style={styles.readTime}>2 MIN READ · {activeReading.source === 'curated' ? 'CURATED' : 'PERSONAL BASELINE'}</Text>
                <View style={styles.readButton}>
                  <Text style={styles.readButtonText}>Read the full forecast</Text>
                  <ArrowRight size={15} color={Colors.paperInk} />
                </View>
              </View>
            </Pressable>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>YOUR SKY IN 60 SECONDS</Text>
                <Text style={styles.sectionTitle}>Signals to notice</Text>
              </View>
              <Sparkles size={19} color={Colors.gold} />
            </View>
            <View style={styles.signals}>
              {categories.slice(0, 3).map((entry, index) => (
                <View key={`${entry.category}-${index}`} style={[styles.signal, index > 0 && styles.signalBorder]}>
                  <View style={[styles.signalDot, { backgroundColor: SIGNAL_COLORS[entry.category] ?? Colors.gold }]} />
                  <View style={styles.signalCopy}>
                    <Text style={styles.signalTitle}>{entry.title}</Text>
                    <Text style={styles.signalText} numberOfLines={2}>{entry.content}</Text>
                  </View>
                  <Text style={styles.signalNumber}>0{index + 1}</Text>
                </View>
              ))}
            </View>

            <Pressable style={({ pressed }) => [styles.askCard, pressed && styles.pressed]} onPress={() => navigate('/(app)/chat')}>
              <MessageCircle size={20} color={Colors.gold} />
              <View style={styles.askCopy}>
                <Text style={styles.askTitle}>What does this mean for you?</Text>
                <Text style={styles.askText}>Ask an astrologer about today&apos;s reading.</Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>CONTINUE EXPLORING</Text>
                <Text style={styles.sectionTitle}>Your almanac</Text>
              </View>
            </View>
            <View style={styles.library}>
              {[
                { title: 'Birth chart', subtitle: 'Your cosmic fingerprint', Icon: Compass, route: '/(app)/chart' },
                { title: 'Compatibility', subtitle: 'A sun-sign relationship snapshot', Icon: Heart, route: '/(app)/compatibility' },
                { title: 'Reading room', subtitle: 'Reports saved for deeper reflection', Icon: BookOpen, route: '/(app)/insights' },
              ].map(({ title, subtitle, Icon, route }, index) => (
                <Pressable key={title} style={[styles.libraryRow, index > 0 && styles.libraryBorder]} onPress={() => navigate(route)}>
                  <View style={styles.libraryIcon}><Icon size={19} color={Colors.gold} strokeWidth={1.7} /></View>
                  <View style={styles.libraryCopy}>
                    <Text style={styles.libraryTitle}>{title}</Text>
                    <Text style={styles.librarySubtitle}>{subtitle}</Text>
                  </View>
                  <ChevronRight size={17} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>

            {profileMissing && !promptDismissed && (
              <GlassCard variant="subtle" style={styles.accuracyNote}>
                <View style={styles.accuracyRule} />
                <View style={styles.accuracyCopy}>
                  <Text style={styles.accuracyLabel}>CALIBRATION NOTE</Text>
                  <Text style={styles.accuracyText}>
                    Adding your {profileMissing.join(', ')} will sharpen the readings that depend on houses and timing.
                  </Text>
                  <Pressable onPress={() => navigate('/(app)/profile')}>
                    <Text style={styles.accuracyAction}>Improve reading accuracy</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setPromptDismissed(true)} hitSlop={10}>
                  <X size={15} color={Colors.textMuted} />
                </Pressable>
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  masthead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  date: { color: Colors.textPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  edition: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2, marginTop: 5 },
  profileButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center' },
  profileGlyph: { fontSize: 20, color: Colors.gold },
  intro: { marginTop: 28, marginBottom: 24 },
  greeting: { color: Colors.textSecondary, fontFamily: Fonts.display, fontSize: 22 },
  name: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 38, lineHeight: 42, letterSpacing: -0.8 },
  leadCard: { backgroundColor: Colors.paper, borderRadius: 24, padding: 22, marginBottom: 32, overflow: 'hidden' },
  leadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(25,29,30,0.14)' },
  leadKicker: { color: Colors.paperInk, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  leadMeta: { color: 'rgba(25,29,30,0.58)', fontSize: 12, fontWeight: '600', marginTop: 5 },
  moon: { fontSize: 27 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  loadingText: { color: 'rgba(25,29,30,0.58)', fontSize: 11 },
  leadQuote: { color: Colors.paperInk, fontFamily: Fonts.display, fontSize: 23, lineHeight: 33, marginVertical: 22, letterSpacing: -0.3 },
  leadFooter: { gap: 14 },
  readTime: { color: 'rgba(25,29,30,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1.15 },
  readButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readButtonText: { color: Colors.paperInk, fontSize: 14, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  sectionKicker: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginBottom: 6 },
  sectionTitle: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 25, letterSpacing: -0.25 },
  signals: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.bgCardBorder, marginBottom: 22 },
  signal: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16 },
  signalBorder: { borderTopWidth: 1, borderTopColor: 'rgba(241,236,226,0.08)' },
  signalDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  signalCopy: { flex: 1 },
  signalTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  signalText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  signalNumber: { color: Colors.textFaint, fontFamily: Fonts.mono, fontSize: 11 },
  askCard: { minHeight: 76, borderRadius: 16, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.bgCard, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 34 },
  askCopy: { flex: 1 },
  askTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  askText: { color: Colors.textMuted, fontSize: 12, marginTop: 3 },
  library: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.bgCardBorder, marginBottom: 22 },
  libraryRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 13 },
  libraryBorder: { borderTopWidth: 1, borderTopColor: 'rgba(241,236,226,0.08)' },
  libraryIcon: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: Colors.bgCardBorder, alignItems: 'center', justifyContent: 'center' },
  libraryCopy: { flex: 1 },
  libraryTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  librarySubtitle: { color: Colors.textMuted, fontSize: 12, marginTop: 3 },
  accuracyNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 22 },
  accuracyRule: { width: 2, alignSelf: 'stretch', backgroundColor: Colors.gold, borderRadius: 1 },
  accuracyCopy: { flex: 1 },
  accuracyLabel: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 6 },
  accuracyText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  accuracyAction: { color: Colors.goldLight, fontSize: 12, fontWeight: '800', marginTop: 10 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
