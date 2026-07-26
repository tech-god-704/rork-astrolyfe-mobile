import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, ChevronRight, Clock3, Compass, Heart, MessageCircle, MoonStar, Sparkles, X } from 'lucide-react-native';
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
  const reveal = useRef(new Animated.Value(1)).current;

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
                <Text style={styles.edition}>YOUR COSMIC WEATHER</Text>
              </View>
              <Pressable style={({ pressed }) => [styles.profileButton, pressed && styles.profileButtonPressed]} onPress={() => navigate('/(app)/profile')} accessibilityRole="button" accessibilityLabel="Open your profile">
                <Text style={styles.profileGlyph}>{zodiac?.symbol ?? '✦'}</Text>
              </Pressable>
            </View>

            <View style={styles.intro}>
              <Text style={styles.greeting}>Good {date.getHours() < 12 ? 'morning' : date.getHours() < 18 ? 'afternoon' : 'evening'},</Text>
              <Text style={styles.name}>{profile?.display_name || 'Stargazer'}.</Text>
            </View>

            <View style={styles.contextStrip}>
              <View style={styles.contextItem}>
                <Text style={styles.contextSymbol}>{zodiac?.symbol ?? '✦'}</Text>
                <View>
                  <Text style={styles.contextLabel}>YOUR SIGN</Text>
                  <Text style={styles.contextValue}>{zodiac?.name ?? signName}</Text>
                </View>
              </View>
              <View style={styles.contextDivider} />
              <View style={styles.contextItem}>
                <MoonStar size={16} color={Colors.purpleLight} />
                <View>
                  <Text style={styles.contextLabel}>MOON</Text>
                  <Text style={styles.contextValue}>{moonPhase.name}</Text>
                </View>
              </View>
              <View style={styles.contextDivider} />
              <View style={styles.contextTime}>
                <Clock3 size={14} color={Colors.textMuted} />
                <Text style={styles.contextTimeText}>2 min</Text>
              </View>
            </View>

            <Pressable onPress={() => navigate('/(app)/horoscope')} style={({ pressed }) => [styles.leadShell, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Open your full forecast">
              <LinearGradient
                colors={[Colors.deepViolet, Colors.bgCardSolid]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.leadCard}
              >
                <View style={styles.leadTop}>
                  <View>
                    <Text style={styles.leadKicker}>TODAY&apos;S ENERGY</Text>
                    <Text style={styles.leadMeta}>{zodiac?.name ?? signName} · {moonPhase.name}</Text>
                  </View>
                  <Text style={styles.moon}>{moonPhase.emoji}</Text>
                </View>
                {curatedQuery.isLoading && (
                  <View style={styles.loading} accessibilityLiveRegion="polite">
                    <ActivityIndicator size="small" color={Colors.paperInk} />
                    <Text style={styles.loadingText}>Refining today&apos;s guidance…</Text>
                  </View>
                )}
                <Text style={styles.leadQuote}>{lead}</Text>
                <View style={styles.leadFooter}>
                  <Text style={styles.readTime}>2 MIN READ · {activeReading.source === 'curated' ? 'CURATED' : 'PERSONAL BASELINE'}</Text>
                  <View style={styles.readButton}>
                    <Text style={styles.readButtonText}>Open your full forecast</Text>
                    <ArrowRight size={15} color={Colors.paperInk} />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>QUICK READ</Text>
                <Text style={styles.sectionTitle}>What&apos;s active now</Text>
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

            <Pressable style={({ pressed }) => [styles.askCard, pressed && styles.pressed]} onPress={() => navigate('/(app)/chat')} accessibilityRole="button" accessibilityLabel="Ask an astrologer about today's reading">
              <View style={styles.askIcon}>
                <MessageCircle size={19} color={Colors.lavenderIce} />
              </View>
              <View style={styles.askCopy}>
                <Text style={styles.askTitle}>What does this mean for you?</Text>
                <Text style={styles.askText}>Ask an astrologer about today&apos;s reading.</Text>
              </View>
              <ChevronRight size={18} color={Colors.textMuted} />
            </Pressable>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionKicker}>GO DEEPER</Text>
                <Text style={styles.sectionTitle}>Explore your universe</Text>
              </View>
            </View>
            <View style={styles.library}>
              {[
                { title: 'Birth chart', subtitle: 'Your cosmic fingerprint', Icon: Compass, route: '/(app)/chart' },
                { title: 'Compatibility', subtitle: 'A sun-sign relationship snapshot', Icon: Heart, route: '/(app)/compatibility' },
                { title: 'Cosmic insights', subtitle: 'Deep-dive reports made for you', Icon: BookOpen, route: '/(app)/insights' },
              ].map(({ title, subtitle, Icon, route }, index) => (
                <Pressable key={title} style={({ pressed }) => [styles.libraryRow, index > 0 && styles.libraryBorder, pressed && styles.libraryRowPressed]} onPress={() => navigate(route)} accessibilityRole="button" accessibilityLabel={`${title}. ${subtitle}`}>
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
                  <Text style={styles.accuracyLabel}>PROFILE ACCURACY</Text>
                  <Text style={styles.accuracyText}>
                    Adding your {profileMissing.join(', ')} will sharpen the readings that depend on houses and timing.
                  </Text>
                  <Pressable onPress={() => navigate('/(app)/profile')} accessibilityRole="button" accessibilityLabel="Improve reading accuracy">
                    <Text style={styles.accuracyAction}>Improve reading accuracy</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setPromptDismissed(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss profile accuracy reminder">
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
  profileButtonPressed: { backgroundColor: Colors.bgCardHover, transform: [{ scale: 0.96 }] },
  profileGlyph: { fontSize: 20, color: Colors.gold },
  intro: { marginTop: 28, marginBottom: 18 },
  greeting: { color: Colors.textSecondary, fontFamily: Fonts.display, fontSize: 22 },
  name: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 40, fontWeight: '800', lineHeight: 44, letterSpacing: -1.2 },
  contextStrip: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: 'rgba(218,200,242,0.045)',
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    paddingHorizontal: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contextItem: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  contextSymbol: { color: Colors.lavenderIce, fontSize: 18 },
  contextLabel: { color: Colors.textFaint, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  contextValue: { color: Colors.textPrimary, fontSize: 11, fontWeight: '800', marginTop: 2 },
  contextDivider: { width: 1, height: 26, backgroundColor: Colors.bgCardBorder, marginHorizontal: 8 },
  contextTime: { alignItems: 'center', gap: 3 },
  contextTimeText: { color: Colors.textMuted, fontSize: 9, fontWeight: '700' },
  leadShell: {
    borderRadius: 24,
    marginBottom: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.24)',
    shadowColor: Colors.purple,
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
  },
  leadCard: { padding: 22 },
  leadTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(218,200,242,0.16)' },
  leadKicker: { color: Colors.paperInk, fontSize: 10, fontWeight: '900', letterSpacing: 1.7 },
  leadMeta: { color: 'rgba(218,200,242,0.58)', fontSize: 12, fontWeight: '600', marginTop: 5 },
  moon: { fontSize: 27 },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  loadingText: { color: 'rgba(218,200,242,0.58)', fontSize: 11 },
  leadQuote: { color: Colors.paperInk, fontFamily: Fonts.display, fontSize: 23, lineHeight: 33, marginVertical: 22, letterSpacing: -0.3 },
  leadFooter: { gap: 14 },
  readTime: { color: 'rgba(218,200,242,0.52)', fontSize: 9, fontWeight: '800', letterSpacing: 1.15 },
  readButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  readButtonText: { color: Colors.paperInk, fontSize: 14, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  sectionKicker: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginBottom: 6 },
  sectionTitle: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 25, fontWeight: '800', letterSpacing: -0.55 },
  signals: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.bgCardBorder, marginBottom: 22 },
  signal: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16 },
  signalBorder: { borderTopWidth: 1, borderTopColor: 'rgba(218,200,242,0.09)' },
  signalDot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  signalCopy: { flex: 1 },
  signalTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  signalText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  signalNumber: { color: Colors.textFaint, fontFamily: Fonts.mono, fontSize: 11 },
  askCard: { minHeight: 82, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(192,154,235,0.20)', backgroundColor: 'rgba(97,56,163,0.12)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 34 },
  askIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(150,98,198,0.22)', alignItems: 'center', justifyContent: 'center' },
  askCopy: { flex: 1 },
  askTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  askText: { color: Colors.textMuted, fontSize: 12, marginTop: 3 },
  library: { gap: 10, marginBottom: 22 },
  libraryRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 18, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: 'rgba(218,200,242,0.035)', paddingHorizontal: 14 },
  libraryRowPressed: { backgroundColor: Colors.bgCardHover, transform: [{ scale: 0.99 }] },
  libraryBorder: {},
  libraryIcon: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(192,154,235,0.20)', backgroundColor: 'rgba(97,56,163,0.12)', alignItems: 'center', justifyContent: 'center' },
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
