import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Globe, Heart, Briefcase, Home, Sparkles, Flame, MapPin, Search, X, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import GlassCard from '@/components/GlassCard';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { CITIES, type City } from '@/data/cities';
import {
  THEMES,
  ANGLE_LABEL,
  STRENGTH_LABEL,
  placesForTheme,
  readCity,
  meaningOf,
  formatMiles,
  type Theme,
  type PlaceHit,
  type PlacePlanet,
} from '@/services/places';
import { birthMomentFromProfile } from '@/services/places-birth';

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
  cityNeutral: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  cityHit: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cityHitIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cityHitCopy: { flex: 1, gap: 2 },
  cityHitTitle: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  cityHitText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },

  footnote: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 26 },
});
