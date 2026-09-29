import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Heart, MapPin, BookOpen, ChevronRight, Clock3 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import GlassCard from '@/components/GlassCard';
import LineMap from '@/components/LineMap';
import TimingNote from '@/components/TimingNote';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { fetchUserReports } from '@/services/reports';
import { extractImageSrc } from '@/lib/reportFormat';
import { calculateNatalChart, getInterpretation } from '@/services/natal';
import { resolveBirth, birthUtcOffsetMinutes } from '@/services/personal-horoscope';
import { placesForTheme, meaningOf, ANGLE_LABEL, formatMiles } from '@/services/places';
import { birthMomentFromProfile } from '@/services/places-birth';
import { placeTiming, describeWindow } from '@/services/places-timing';

export default function SoulmateScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { user, profile } = useAuth();

  // Same key as the Reports tab, so the two share one cached fetch.
  const reportsQuery = useQuery({
    queryKey: ['userReports', user?.email],
    queryFn: () => fetchUserReports(user!.email!),
    enabled: !!user?.email,
    staleTime: 1000 * 60 * 2,
  });

  const portraitSrc = useMemo(() => {
    const row = (reportsQuery.data ?? []).find((r) => r.report_type === 'soulmate_portrait');
    return row ? extractImageSrc(row.content_html) : null;
  }, [reportsQuery.data]);

  const hasLoveReport = (reportsQuery.data ?? []).some((r) => r.report_type === 'venus_love');

  const venus = useMemo(() => {
    const birth = resolveBirth(profile);
    if (!birth) return null;
    try {
      const chart = calculateNatalChart({
        year: birth.year,
        month: birth.month,
        day: birth.day,
        hour: birth.hour,
        minute: birth.minute,
        utcOffsetMinutes: birthUtcOffsetMinutes(profile, birth),
      });
      return chart.planets.find((p) => p.name === 'Venus') ?? null;
    } catch {
      return null;
    }
  }, [profile]);

  const birthMoment = useMemo(() => birthMomentFromProfile(profile), [profile]);
  const lovePlaces = useMemo(() => (birthMoment ? placesForTheme(birthMoment, 'love', 3) : []), [birthMoment]);
  const dayKey = new Date().toDateString();
  const loveTiming = useMemo(
    () => (birthMoment ? placeTiming(birthMoment, 'Venus') : null),
    // dayKey is deliberately a dependency: the window moves with today's date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [birthMoment, dayKey],
  );

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={reportsQuery.isRefetching} onRefresh={() => void reportsQuery.refetch()} tintColor={Colors.purple} />
          }
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>YOUR PERSON</Text>
              <Text style={styles.title}>Soulmate</Text>
              <Text style={styles.subtitle}>Who the stars drew for you, and where you&apos;re likely to meet.</Text>
            </View>
            <View style={styles.headerIcon}>
              <Heart size={24} color={Colors.accent} />
            </View>
          </View>

          <GlassCard variant="elevated" style={styles.portraitCard}>
            {reportsQuery.isLoading ? (
              <View style={styles.portraitPlaceholder}>
                <ActivityIndicator color={Colors.purple} />
              </View>
            ) : portraitSrc ? (
              <Image
                source={{ uri: portraitSrc }}
                style={styles.portrait}
                resizeMode="cover"
                accessibilityLabel="Your soulmate portrait"
              />
            ) : (
              <View style={styles.portraitPlaceholder}>
                <Clock3 size={28} color={Colors.purpleLight} />
                <Text style={styles.placeholderTitle}>Your portrait is being drawn</Text>
                <Text style={styles.placeholderText}>
                  It usually arrives within 24 to 48 hours of joining, and we&apos;ll email you the moment it&apos;s ready.
                </Text>
              </View>
            )}
            <Text style={styles.portraitCaption}>Drawn from everything you told us about yourself.</Text>
          </GlassCard>

          {venus && (
            <>
              <Text style={styles.sectionLabel}>How you love</Text>
              <GlassCard style={styles.venusCard}>
                <Text style={styles.venusSign}>Venus in {venus.sign}</Text>
                <Text style={styles.bodyText}>{getInterpretation('Venus', venus.sign)}</Text>
              </GlassCard>
            </>
          )}

          <Text style={styles.sectionLabel}>Where you&apos;re likely to meet</Text>
          {!birthMoment ? (
            <GlassCard>
              <Text style={styles.bodyText}>
                Add your exact birth time and birthplace in your profile to see the cities where your love lines run.
              </Text>
            </GlassCard>
          ) : lovePlaces.length === 0 ? (
            <GlassCard>
              <Text style={styles.bodyText}>
                Your Venus lines mostly cross open ocean or quieter regions. Check any city in Power Places.
              </Text>
            </GlassCard>
          ) : (
            <View style={styles.list}>
              <LineMap birth={birthMoment} planet="Venus" color={Colors.accent} hits={lovePlaces} />
              {loveTiming && (
                <TimingNote
                  now={loveTiming.now}
                  best={loveTiming.best}
                  label="Your love lines peak"
                  cause={(w) => describeWindow(w, 'Venus')}
                />
              )}
              {lovePlaces.map((hit) => (
                <GlassCard key={`${hit.city.name}-${hit.angle}`} style={styles.placeCard}>
                  <View style={styles.placeTop}>
                    <MapPin size={16} color={Colors.accent} />
                    <Text style={styles.placeName}>{hit.city.name}</Text>
                    <Text style={styles.placeCountry}>{hit.city.country}</Text>
                  </View>
                  <Text style={styles.bodyText}>{meaningOf(hit.planet, hit.angle)}</Text>
                  <Text style={styles.placeMeta}>
                    Venus {ANGLE_LABEL[hit.angle].toLowerCase()} · passes {formatMiles(hit.distanceKm)} away
                  </Text>
                </GlassCard>
              ))}
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            onPress={() => router.push('/(app)/(home)')}
            accessibilityRole="button"
            accessibilityLabel="See all your power places"
          >
            <MapPin size={16} color={Colors.purpleLight} />
            <Text style={styles.linkText}>See all your power places</Text>
            <ChevronRight size={16} color={Colors.textMuted} />
          </Pressable>

          {hasLoveReport && (
            <Pressable
              style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              onPress={() => router.push('/(app)/insights')}
              accessibilityRole="button"
              accessibilityLabel="Read your full Venus love report"
            >
              <BookOpen size={16} color={Colors.purpleLight} />
              <Text style={styles.linkText}>Read your full love report</Text>
              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110 },
  pressed: { opacity: 0.78 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, marginBottom: 20, gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginBottom: 6 },
  title: { fontSize: 36, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' },

  portraitCard: { padding: 12, marginBottom: 28, gap: 10 },
  portrait: { width: '100%', aspectRatio: 4 / 5, borderRadius: 16, backgroundColor: Colors.bgCardSolid },
  portraitPlaceholder: { width: '100%', aspectRatio: 4 / 5, borderRadius: 16, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  placeholderTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.display, fontWeight: '800', textAlign: 'center' },
  placeholderText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  portraitCaption: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },

  sectionLabel: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 22, fontWeight: '800', letterSpacing: -0.45, marginBottom: 12 },
  venusCard: { gap: 6, marginBottom: 28 },
  venusSign: { color: Colors.accent, fontSize: 17, fontFamily: Fonts.display, fontWeight: '800' },
  bodyText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },

  list: { gap: 12 },
  placeCard: { gap: 8 },
  placeTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  placeName: { color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.display, fontWeight: '800' },
  placeCountry: { color: Colors.textMuted, fontSize: 12 },
  placeMeta: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.bgCardBorder, marginTop: 8 },
  linkText: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
});
