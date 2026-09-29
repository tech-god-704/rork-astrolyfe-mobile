import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Globe, Heart, Briefcase, Home, Sparkles, Flame, MapPin, Search, X, ChevronRight, Crown, Share2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import GlassCard from '@/components/GlassCard';
import LineMap from '@/components/LineMap';
import TimingNote from '@/components/TimingNote';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { CITIES, type City } from '@/data/cities';
import {
  THEMES,
  ANGLE_LABEL,
  STRENGTH_LABEL,
  placesForTheme,
  readCity,
  powerCity,
  relocatedRising,
  meaningOf,
  formatMiles,
  type Theme,
  type PlaceHit,
  type PlacePlanet,
} from '@/services/places';
import { birthMomentFromProfile } from '@/services/places-birth';
import { placeTiming, describeWindow, type PlaceTiming } from '@/services/places-timing';

const THEME_STYLE: Record<Theme, { color: string; Icon: typeof Heart }> = {
  love: { color: Colors.accent, Icon: Heart },
  career: { color: Colors.purpleLight, Icon: Briefcase },
  home: { color: Colors.teal, Icon: Home },
  luck: { color: Colors.success, Icon: Sparkles },
  drive: { color: Colors.nebulaMagenta, Icon: Flame },
};

const PLANET_THEME: Record<PlacePlanet, Theme> = {
  Venus: 'love',
  Sun: 'career',
  Moon: 'home',
  Jupiter: 'luck',
  Mars: 'drive',
};

/** Short life-area names for tags and the share message. */
const THEME_LABEL_BY_PLANET: Record<PlacePlanet, string> = {
  Venus: 'Love',
  Sun: 'Career',
  Moon: 'Home',
  Jupiter: 'Luck',
  Mars: 'Drive',
};

export default function PowerPlaces() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { profile } = useAuth();
  const [theme, setTheme] = useState<Theme>('love');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<City | null>(null);

  const birth = useMemo(
    () => birthMomentFromProfile(profile),
    // Only the fields the calculation reads — a notification toggle must not recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile?.birth_date, profile?.timezone, profile?.quiz_data?.birth_hour, profile?.quiz_data?.birth_minute],
  );

  const places = useMemo(() => (birth ? placesForTheme(birth, theme, 5) : []), [birth, theme]);
  const cityHits = useMemo(() => (birth && picked ? readCity(birth, picked) : []), [birth, picked]);
  const pickedRising = useMemo(
    () => (birth && picked ? relocatedRising(birth, picked.lat, picked.lon) : null),
    [birth, picked],
  );
  const headline = useMemo(() => (birth ? powerCity(birth) : null), [birth]);

  // When each line is switched on, from the real sky over the next year. Recomputed per
  // day at most; each planet is a few milliseconds.
  const dayKey = new Date().toDateString();
  const timingFor = useMemo(() => {
    const cache = new Map<PlacePlanet, PlaceTiming>();
    return (planet: PlacePlanet): PlaceTiming | null => {
      if (!birth) return null;
      if (!cache.has(planet)) cache.set(planet, placeTiming(birth, planet));
      return cache.get(planet)!;
    };
    // dayKey is deliberately a dependency: the windows move with today's date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birth, dayKey]);
  // The Power City has several lines; show whichever of them is switched on now, else the
  // strongest upcoming window among them.
  const headlineTiming = useMemo(() => {
    if (!headline) return null;
    const options = [...new Set(headline.hits.map((h) => h.planet))].map((planet) => ({ planet, t: timingFor(planet)! }));
    const live = options.filter((o) => o.t.now).sort((x, y) => y.t.now!.score - x.t.now!.score)[0];
    if (live) return { planet: live.planet, now: live.t.now, best: null };
    const next = options.filter((o) => o.t.best).sort((x, y) => y.t.best!.score - x.t.best!.score)[0];
    return next ? { planet: next.planet, now: null, best: next.t.best } : null;
  }, [headline, timingFor]);
  const themeTiming = timingFor(THEMES.find((t) => t.key === theme)!.planet);
  const pickedTiming = cityHits.length > 0 ? timingFor(cityHits[0].planet) : null;
  const headlineRising = useMemo(
    () => (birth && headline ? relocatedRising(birth, headline.city.lat, headline.city.lon) : null),
    [birth, headline],
  );

  const shareHeadline = async () => {
    if (!headline) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const areas = headline.hits.map((h) => THEME_LABEL_BY_PLANET[h.planet].toLowerCase()).join(', ');
    try {
      await Share.share({
        message: `My power city is ${headline.city.name}, ${headline.city.country}. It's where my birth chart lines up for ${areas}. Found mine with AstroLyfe.`,
      });
    } catch {
      // The customer dismissed the sheet, or sharing isn't available — nothing to do.
    }
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return CITIES.filter((c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)).slice(0, 6);
  }, [query]);

  const activeTheme = THEMES.find((t) => t.key === theme)!;

  const selectTheme = (key: Theme) => {
    Haptics.selectionAsync().catch(() => {});
    setTheme(key);
  };

  const pickCity = (city: City) => {
    Haptics.selectionAsync().catch(() => {});
    setPicked(city);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>WHERE YOU BELONG</Text>
              <Text style={styles.title}>Power Places</Text>
              <Text style={styles.subtitle}>The cities your birth chart lights up.</Text>
            </View>
            <View style={styles.headerIcon}>
              <Globe size={24} color={Colors.gold} />
            </View>
          </View>

          <LinearGradient
            colors={[Colors.deepViolet, 'rgba(59,33,113,0.76)', Colors.bgCardSolid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroText}>
              The moment you were born, every planet sat overhead somewhere on Earth. Those spots trace lines
              around the globe. Where a line crosses a city, that part of your life gets louder there.
            </Text>
          </LinearGradient>

          {!birth ? (
            <GlassCard style={styles.missingCard}>
              <Text style={styles.missingTitle}>Add your exact birth time</Text>
              <Text style={styles.missingText}>
                Your lines shift up to 1,000 miles for every hour of birth time, so we need the exact time and
                place you were born to map them.
              </Text>
              <Pressable
                style={({ pressed }) => [styles.missingBtn, pressed && styles.pressed]}
                onPress={() => router.push('/(app)/profile')}
                accessibilityRole="button"
                accessibilityLabel="Add your birth details in your profile"
              >
                <Text style={styles.missingBtnText}>Add birth details</Text>
                <ChevronRight size={16} color={Colors.paperInk} />
              </Pressable>
            </GlassCard>
          ) : (
            <>
              {headline && (
                <LinearGradient
                  colors={['rgba(217,148,242,0.20)', 'rgba(97,56,163,0.28)', Colors.bgCardSolid]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.powerCard}
                >
                  <View style={styles.powerTop}>
                    <View style={styles.powerBadge}>
                      <Crown size={12} color={Colors.accent} />
                      <Text style={styles.powerBadgeText}>YOUR POWER CITY</Text>
                    </View>
                    <Pressable
                      onPress={shareHeadline}
                      hitSlop={10}
                      style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Share your power city"
                    >
                      <Share2 size={16} color={Colors.textPrimary} />
                    </Pressable>
                  </View>
                  <Text style={styles.powerName}>{headline.city.name}</Text>
                  <Text style={styles.powerCountry}>{headline.city.country}</Text>
                  <Text style={styles.powerText}>
                    {headline.hits.length === 1
                      ? "One of your lines runs close by. It's the strongest spot on your map."
                      : `${headline.hits.length} of your lines cross here. It's the strongest spot on your map.`}
                  </Text>
                  <View style={styles.powerTags}>
                    {headline.hits.map((h) => {
                      const { color, Icon } = THEME_STYLE[PLANET_THEME[h.planet]];
                      return (
                        <View key={`${h.planet}-${h.angle}`} style={[styles.powerTag, { borderColor: `${color}66` }]}>
                          <Icon size={12} color={color} />
                          <Text style={styles.powerTagText}>{THEME_LABEL_BY_PLANET[h.planet]}</Text>
                        </View>
                      );
                    })}
                  </View>
                  {headlineRising && (
                    <Text style={styles.powerRising}>Live here and you&apos;d rise as {headlineRising}.</Text>
                  )}
                  {headlineTiming && (
                    <View style={styles.timingWrap}>
                      <TimingNote
                        now={headlineTiming.now}
                        best={headlineTiming.best}
                        cause={(w) => describeWindow(w, headlineTiming.planet)}
                      />
                    </View>
                  )}
                </LinearGradient>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
                style={styles.chipScroll}
              >
                {THEMES.map((t) => {
                  const { color, Icon } = THEME_STYLE[t.key];
                  const active = t.key === theme;
                  return (
                    <Pressable
                      key={t.key}
                      onPress={() => selectTheme(t.key)}
                      style={({ pressed }) => [styles.chip, active && { borderColor: color, backgroundColor: `${color}22` }, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={t.label}
                    >
                      <Icon size={14} color={active ? color : Colors.textMuted} />
                      <Text style={[styles.chipText, active && { color: Colors.textPrimary }]}>{t.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.themeBlurb}>{activeTheme.blurb}</Text>

              <LineMap birth={birth} planet={activeTheme.planet} color={THEME_STYLE[theme].color} hits={places} />

              {themeTiming && places.length > 0 && (
                <View style={styles.themeTiming}>
                  <TimingNote
                    now={themeTiming.now}
                    best={themeTiming.best}
                    label={`Your ${THEME_LABEL_BY_PLANET[activeTheme.planet].toLowerCase()} places peak`}
                    cause={(w) => describeWindow(w, activeTheme.planet)}
                  />
                </View>
              )}

              {places.length === 0 ? (
                <GlassCard style={styles.emptyCard}>
                  <Text style={styles.emptyText}>
                    Your {activeTheme.planet} lines mostly cross open ocean or quieter regions. Try checking a city below.
                  </Text>
                </GlassCard>
              ) : (
                <View style={styles.list}>
                  {places.map((hit, i) => (
                    <PlaceCard key={`${hit.city.name}-${hit.angle}`} hit={hit} rank={i + 1} styles={styles} />
                  ))}
                </View>
              )}

              <Text style={styles.sectionLabel}>Check a city</Text>
              <View style={styles.searchBox}>
                <Search size={16} color={Colors.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search a city, e.g. Tokyo"
                  placeholderTextColor={Colors.textMuted}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="search"
                  accessibilityLabel="Search a city"
                />
                {query.length > 0 && (
                  <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                    <X size={16} color={Colors.textMuted} />
                  </Pressable>
                )}
              </View>

              {matches.length > 0 && (
                <View style={styles.matchList}>
                  {matches.map((c) => (
                    <Pressable
                      key={c.name}
                      onPress={() => pickCity(c)}
                      style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.name}, ${c.country}`}
                    >
                      <MapPin size={14} color={Colors.purpleLight} />
                      <Text style={styles.matchName}>{c.name}</Text>
                      <Text style={styles.matchCountry}>{c.country}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
              {query.trim().length >= 2 && matches.length === 0 && (
                <Text style={styles.noMatch}>We don&apos;t have that city on our map yet.</Text>
              )}

              {picked && (
                <GlassCard style={styles.cityCard}>
                  <View style={styles.cityHeader}>
                    <MapPin size={18} color={Colors.gold} />
                    <Text style={styles.cityName}>{picked.name}</Text>
                    <Text style={styles.cityCountry}>{picked.country}</Text>
                  </View>
                  {pickedRising && (
                    <Text style={styles.cityRising}>Live here and you&apos;d rise as {pickedRising}.</Text>
                  )}
                  {cityHits.length === 0 ? (
                    <Text style={styles.cityNeutral}>
                      None of your major lines pass close by. A neutral place for you: no strong pull either way.
                    </Text>
                  ) : (
                    cityHits.map((hit) => {
                      const { color, Icon } = THEME_STYLE[PLANET_THEME[hit.planet]];
                      return (
                        <View key={`${hit.planet}-${hit.angle}`} style={styles.cityHit}>
                          <View style={[styles.cityHitIcon, { backgroundColor: `${color}22` }]}>
                            <Icon size={14} color={color} />
                          </View>
                          <View style={styles.cityHitCopy}>
                            <Text style={styles.cityHitTitle}>
                              {hit.planet} {ANGLE_LABEL[hit.angle].toLowerCase()} · {formatMiles(hit.distanceKm)}
                            </Text>
                            <Text style={styles.cityHitText}>{meaningOf(hit.planet, hit.angle)}</Text>
                          </View>
                        </View>
                      );
                    })
                  )}
                  {pickedTiming && (
                    <TimingNote
                      now={pickedTiming.now}
                      best={pickedTiming.best}
                      cause={(w) => describeWindow(w, cityHits[0].planet)}
                    />
                  )}
                </GlassCard>
              )}

              <Text style={styles.footnote}>
                Calculated on your phone from the planets&apos; exact positions at the moment you were born.
              </Text>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function PlaceCard({ hit, rank, styles }: { hit: PlaceHit; rank: number; styles: ReturnType<typeof createStyles> }) {
  const { color } = THEME_STYLE[PLANET_THEME[hit.planet]];
  return (
    <GlassCard style={styles.placeCard}>
      <View style={[styles.placeAccent, { backgroundColor: color }]} />
      <View style={styles.placeTop}>
        <Text style={styles.placeRank}>{rank}</Text>
        <View style={styles.placeTitleWrap}>
          <Text style={styles.placeName}>{hit.city.name}</Text>
          <Text style={styles.placeCountry}>{hit.city.country}</Text>
        </View>
        <View style={[styles.strengthPill, { backgroundColor: `${color}22` }]}>
          <Text style={[styles.strengthText, { color }]}>{STRENGTH_LABEL[hit.strength]}</Text>
        </View>
      </View>
      <Text style={styles.placeMeaning}>{meaningOf(hit.planet, hit.angle)}</Text>
      <Text style={styles.placeMeta}>
        {hit.planet} {ANGLE_LABEL[hit.angle].toLowerCase()} · passes {formatMiles(hit.distanceKm)} away
      </Text>
    </GlassCard>
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
  headerIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.goldDim, alignItems: 'center', justifyContent: 'center' },

  hero: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(192,154,235,0.26)', padding: 18, marginBottom: 22 },
  heroText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },

  powerCard: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(217,148,242,0.35)', padding: 18, marginBottom: 24 },
  powerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  powerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(217,148,242,0.14)' },
  powerBadgeText: { color: Colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  shareBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(237,228,253,0.10)' },
  powerName: { color: Colors.textPrimary, fontSize: 32, fontFamily: Fonts.display, fontWeight: '800', letterSpacing: -0.8 },
  powerCountry: { color: Colors.textMuted, fontSize: 13, marginTop: 2 },
  powerText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 10 },
  powerTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  powerTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
  powerTagText: { color: Colors.textPrimary, fontSize: 12, fontWeight: '700' },
  powerRising: { color: Colors.lavenderIce, fontSize: 13, fontWeight: '700', marginTop: 12 },
  timingWrap: { marginTop: 14 },
  themeTiming: { marginTop: 12, marginBottom: 4 },

  missingCard: { gap: 10 },
  missingTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.display, fontWeight: '800' },
  missingText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  missingBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: Colors.purple, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 999, marginTop: 4 },
  missingBtnText: { color: Colors.paperInk, fontSize: 14, fontWeight: '800' },

  chipScroll: { marginHorizontal: -20, marginBottom: 12 },
  chipRow: { paddingHorizontal: 20, gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.bgCard },
  chipText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  themeBlurb: { color: Colors.textSecondary, fontSize: 14, marginBottom: 14 },

  list: { gap: 12, marginBottom: 30 },
  placeCard: { gap: 8, overflow: 'hidden' },
  placeAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  placeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  placeRank: { color: Colors.textMuted, fontSize: 15, fontWeight: '900', width: 16 },
  placeTitleWrap: { flex: 1 },
  placeName: { color: Colors.textPrimary, fontSize: 19, fontFamily: Fonts.display, fontWeight: '800' },
  placeCountry: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
  strengthPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  strengthText: { fontSize: 11, fontWeight: '800' },
  placeMeaning: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  placeMeta: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },

  emptyCard: { marginBottom: 30 },
  emptyText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },

  sectionLabel: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 22, fontWeight: '800', letterSpacing: -0.45, marginBottom: 12 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.bgInputBorder, backgroundColor: Colors.bgInput, borderRadius: 14, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 13 },
  matchList: { marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.bgCard, overflow: 'hidden' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.bgCardBorder },
  matchName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  matchCountry: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  noMatch: { color: Colors.textMuted, fontSize: 13, marginTop: 10 },

  cityCard: { marginTop: 14, gap: 12 },
  cityHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cityName: { color: Colors.textPrimary, fontSize: 20, fontFamily: Fonts.display, fontWeight: '800' },
  cityCountry: { color: Colors.textMuted, fontSize: 13 },
  cityRising: { color: Colors.lavenderIce, fontSize: 13, fontWeight: '700' },
  cityNeutral: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  cityHit: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cityHitIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cityHitCopy: { flex: 1, gap: 2 },
  cityHitTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  cityHitText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },

  footnote: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 26 },
});
