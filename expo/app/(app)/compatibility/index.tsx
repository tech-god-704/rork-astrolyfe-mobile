import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, Heart, MapPin, Search, X, Lock, Share2, ChevronRight, Pencil } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import GlassCard from '@/components/GlassCard';
import LineMap from '@/components/LineMap';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { CITIES, type City } from '@/data/cities';
import { couplePartnerKey } from '@/constants/storageKeys';
import { getBirthDateError } from '@/lib/validation';
import { coupleCities, type PlaceHit, type PlacePlanet } from '@/services/places';
import { birthMomentFromProfile, birthMomentFromParts } from '@/services/places-birth';

/**
 * Couple Map — the cities where two people's charts both light up.
 *
 * Replaces a sun-sign compatibility score ("Cancer + Leo = 85%"), the most common
 * feature in the category. This needs both exact birth moments and gives a different
 * answer for every pair, down to the minute.
 *
 * The partner's details are someone else's personal data, so they stay on this
 * device (AsyncStorage, per account) and are cleared when the account is deleted.
 */

interface SavedPartner {
  name: string;
  date: string;
  time: string;
  cityName: string;
}

const PARTNER_COLOR = Colors.electricBlue;
const LIFE_AREA: Record<PlacePlanet, string> = { Venus: 'Love', Sun: 'Career', Moon: 'Home', Jupiter: 'Luck', Mars: 'Drive' };

const areas = (hits: PlaceHit[]) => [...new Set(hits.map((h) => LIFE_AREA[h.planet]))].join(', ');

function parseTime(value: string): { hour: number; minute: number } | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export default function CoupleMapScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { user, profile } = useAuth();
  const email = user?.email ?? '';

  const [partner, setPartner] = useState<SavedPartner | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [city, setCity] = useState<City | null>(null);
  const [cityQuery, setCityQuery] = useState('');
  const [errors, setErrors] = useState<{ date?: string; time?: string; city?: string }>({});

  useEffect(() => {
    if (!email) return;
    let cancelled = false;
    AsyncStorage.getItem(couplePartnerKey(email))
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            setPartner(JSON.parse(raw) as SavedPartner);
          } catch {
            // Corrupt entry — behave as if none was saved.
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const me = useMemo(() => birthMomentFromProfile(profile), [profile]);

  const them = useMemo(() => {
    if (!partner) return null;
    const c = CITIES.find((x) => x.name === partner.cityName);
    const t = parseTime(partner.time);
    return c && t ? birthMomentFromParts(partner.date, t.hour, t.minute, c.tz) : null;
  }, [partner]);

  const shared = useMemo(() => (me && them ? coupleCities(me, them, { limit: 5 }) : []), [me, them]);
  // The map draws Venus lines, so it highlights the cities where BOTH Venus lines run —
  // highlighting all-planet shared cities put dots nowhere near the lines drawn.
  const loveShared = useMemo(() => (me && them ? coupleCities(me, them, { planet: 'Venus', limit: 5 }) : []), [me, them]);
  const loveCity = loveShared[0] ?? null;
  const partnerLabel = partner?.name.trim() || 'Them';

  const cityMatches = useMemo(() => {
    const q = cityQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return CITIES.filter((c) => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)).slice(0, 5);
  }, [cityQuery]);

  const startEditing = useCallback(() => {
    setName(partner?.name ?? '');
    setDate(partner?.date ?? '');
    setTime(partner?.time ?? '');
    setCity(partner ? CITIES.find((c) => c.name === partner.cityName) ?? null : null);
    setCityQuery('');
    setErrors({});
    setEditing(true);
  }, [partner]);

  const save = async () => {
    const next: typeof errors = {};
    const dateError = date.trim() ? getBirthDateError(date) : 'Enter their birth date';
    if (dateError) next.date = dateError;
    const t = parseTime(time);
    if (!t) next.time = 'Use 24-hour HH:MM, e.g. 14:30';
    if (!city) next.city = 'Pick the city they were born in';
    if (!next.date && t && city && !birthMomentFromParts(date.trim(), t.hour, t.minute, city.tz)) {
      next.date = 'That date doesn’t exist';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }

    const saved: SavedPartner = { name: name.trim(), date: date.trim(), time: time.trim(), cityName: city!.name };
    setPartner(saved);
    setEditing(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    if (email) await AsyncStorage.setItem(couplePartnerKey(email), JSON.stringify(saved)).catch(() => {});
  };

  const remove = async () => {
    setPartner(null);
    setEditing(false);
    if (email) await AsyncStorage.removeItem(couplePartnerKey(email)).catch(() => {});
  };

  const shareLoveCity = async () => {
    if (!loveCity) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await Share.share({
        message: `Our love city is ${loveCity.city.name}, ${loveCity.city.country}. It's where both our Venus lines meet. Found it with AstroLyfe.`,
      });
    } catch {
      // Dismissed or unavailable.
    }
  };

  const showForm = loaded && (editing || !partner);

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
              <Text style={styles.eyebrow}>TWO CHARTS, ONE MAP</Text>
              <Text style={styles.title}>Couple Map</Text>
              <Text style={styles.subtitle}>The cities where you both light up.</Text>
            </View>
            <View style={styles.headerIcon}>
              <Users size={24} color={Colors.accent} />
            </View>
          </View>

          {!me ? (
            <GlassCard style={styles.gap}>
              <Text style={styles.cardTitle}>Add your exact birth time first</Text>
              <Text style={styles.bodyText}>Your map needs your own birth time and birthplace before it can be laid over anyone else&apos;s.</Text>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                onPress={() => router.push('/(app)/profile')}
                accessibilityRole="button"
              >
                <Text style={styles.primaryBtnText}>Add birth details</Text>
                <ChevronRight size={16} color={Colors.paperInk} />
              </Pressable>
            </GlassCard>
          ) : showForm ? (
            <GlassCard style={styles.gap}>
              <Text style={styles.cardTitle}>{partner ? 'Edit your person' : 'Add your person'}</Text>
              <Text style={styles.bodyText}>A partner, a crush, a best friend. We&apos;ll find the places you both come alive.</Text>

              <Text style={styles.label}>Their name (optional)</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. Alex" placeholderTextColor={Colors.textMuted} style={styles.input} maxLength={40} accessibilityLabel="Their name" />

              <Text style={styles.label}>Birth date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                style={[styles.input, errors.date && styles.inputError]}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                accessibilityLabel="Their birth date, year month day"
              />
              {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}

              <Text style={styles.label}>Birth time</Text>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM (24-hour)"
                placeholderTextColor={Colors.textMuted}
                style={[styles.input, errors.time && styles.inputError]}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                accessibilityLabel="Their birth time, 24 hour"
              />
              {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}

              <Text style={styles.label}>Birth city</Text>
              {city ? (
                <Pressable style={({ pressed }) => [styles.pickedCity, pressed && styles.pressed]} onPress={() => setCity(null)} accessibilityRole="button" accessibilityLabel={`${city.name}. Tap to change`}>
                  <MapPin size={14} color={Colors.purpleLight} />
                  <Text style={styles.pickedCityText}>{city.name}, {city.country}</Text>
                  <X size={14} color={Colors.textMuted} />
                </Pressable>
              ) : (
                <>
                  <View style={[styles.searchBox, errors.city && styles.inputError]}>
                    <Search size={16} color={Colors.textMuted} />
                    <TextInput
                      value={cityQuery}
                      onChangeText={setCityQuery}
                      placeholder="Search a city"
                      placeholderTextColor={Colors.textMuted}
                      style={styles.searchInput}
                      autoCorrect={false}
                      accessibilityLabel="Search their birth city"
                    />
                  </View>
                  {cityMatches.map((c) => (
                    <Pressable key={c.name} style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]} onPress={() => { setCity(c); setCityQuery(''); }} accessibilityRole="button">
                      <MapPin size={14} color={Colors.purpleLight} />
                      <Text style={styles.matchName}>{c.name}</Text>
                      <Text style={styles.matchCountry}>{c.country}</Text>
                    </Pressable>
                  ))}
                  <Text style={styles.hint}>Not listed? Pick the nearest big city in the same time zone. It gives the same result.</Text>
                </>
              )}
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}

              <View style={styles.privacyRow}>
                <Lock size={12} color={Colors.textMuted} />
                <Text style={styles.privacyText}>Their details stay on this phone. Nothing is sent anywhere.</Text>
              </View>

              <View style={styles.formButtons}>
                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={save} accessibilityRole="button">
                  <Text style={styles.primaryBtnText}>Map us</Text>
                  <Heart size={14} color={Colors.paperInk} />
                </Pressable>
                {partner && (
                  <Pressable onPress={() => setEditing(false)} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]} accessibilityRole="button">
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </Pressable>
                )}
              </View>
            </GlassCard>
          ) : partner && !them ? (
            <GlassCard style={styles.gap}>
              <Text style={styles.bodyText}>We couldn&apos;t read the saved details. Please enter them again.</Text>
              <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={startEditing} accessibilityRole="button">
                <Text style={styles.primaryBtnText}>Re-enter details</Text>
              </Pressable>
            </GlassCard>
          ) : them ? (
            <>
              <View style={styles.pairRow}>
                <Text style={styles.pairText}>You + {partnerLabel}</Text>
                <Pressable onPress={startEditing} hitSlop={8} style={styles.pairAction} accessibilityRole="button" accessibilityLabel="Edit their details">
                  <Pencil size={14} color={Colors.textMuted} />
                  <Text style={styles.pairActionText}>Edit</Text>
                </Pressable>
                <Pressable onPress={remove} hitSlop={8} style={styles.pairAction} accessibilityRole="button" accessibilityLabel="Remove this person">
                  <X size={14} color={Colors.textMuted} />
                  <Text style={styles.pairActionText}>Remove</Text>
                </Pressable>
              </View>

              {loveCity && (
                <LinearGradient
                  colors={['rgba(217,148,242,0.20)', 'rgba(111,178,250,0.16)', Colors.bgCardSolid]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loveCard}
                >
                  <View style={styles.loveTop}>
                    <Text style={styles.loveBadge}>YOUR LOVE CITY TOGETHER</Text>
                    <Pressable onPress={shareLoveCity} hitSlop={10} style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Share your love city">
                      <Share2 size={16} color={Colors.textPrimary} />
                    </Pressable>
                  </View>
                  <Text style={styles.loveName}>{loveCity.city.name}</Text>
                  <Text style={styles.loveCountry}>{loveCity.city.country}</Text>
                  <Text style={styles.bodyText}>Both of your Venus lines run near here, the classic sign of a place where love comes easier for two.</Text>
                </LinearGradient>
              )}

              <Text style={styles.sectionLabel}>Your love lines, together</Text>
              <LineMap
                birth={me}
                planet="Venus"
                color={Colors.accent}
                partner={{ birth: them, color: PARTNER_COLOR, label: partnerLabel }}
                hits={loveShared.map((c) => c.mine[0])}
                hitColor={Colors.textPrimary}
              />

              <Text style={styles.sectionLabel}>Where you both thrive</Text>
              {shared.length === 0 ? (
                <GlassCard>
                  <Text style={styles.bodyText}>None of the cities on our map sit on lines for both of you. Your strongest places are your own; see Places.</Text>
                </GlassCard>
              ) : (
                <View style={styles.list}>
                  {shared.map((c, i) => (
                    <GlassCard key={c.city.name} style={styles.sharedCard}>
                      <View style={styles.sharedTop}>
                        <Text style={styles.rank}>{i + 1}</Text>
                        <View style={styles.flex}>
                          <Text style={styles.sharedName}>{c.city.name}</Text>
                          <Text style={styles.sharedCountry}>{c.city.country}</Text>
                        </View>
                      </View>
                      <View style={styles.personRow}>
                        <View style={[styles.dot, { backgroundColor: Colors.accent }]} />
                        <Text style={styles.personText}>You: {areas(c.mine)}</Text>
                      </View>
                      <View style={styles.personRow}>
                        <View style={[styles.dot, { backgroundColor: PARTNER_COLOR }]} />
                        <Text style={styles.personText}>{partnerLabel}: {areas(c.theirs)}</Text>
                      </View>
                    </GlassCard>
                  ))}
                </View>
              )}
            </>
          ) : null}
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
  flex: { flex: 1 },
  gap: { gap: 10 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8, marginBottom: 20, gap: 12 },
  headerCopy: { flex: 1 },
  eyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginBottom: 6 },
  title: { fontSize: 36, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -1 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  headerIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center' },

  cardTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.display, fontWeight: '800' },
  bodyText: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  label: { color: Colors.textPrimary, fontSize: 13, fontWeight: '700', marginTop: 6 },
  input: { borderWidth: 1, borderColor: Colors.bgInputBorder, backgroundColor: Colors.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.textPrimary, fontSize: 15 },
  inputError: { borderColor: Colors.accent },
  errorText: { color: Colors.accent, fontSize: 12, fontWeight: '600' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.bgInputBorder, backgroundColor: Colors.bgInput, borderRadius: 12, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.bgCardBorder },
  matchName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  matchCountry: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  hint: { color: Colors.textMuted, fontSize: 12, lineHeight: 17 },
  pickedCity: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: Colors.bgInputBorder, backgroundColor: Colors.bgInput, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  pickedCityText: { flex: 1, color: Colors.textPrimary, fontSize: 15, fontWeight: '600' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  privacyText: { color: Colors.textMuted, fontSize: 12, flex: 1 },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: Colors.purple, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 999 },
  primaryBtnText: { color: Colors.paperInk, fontSize: 14, fontWeight: '800' },
  secondaryBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: Colors.bgCardBorder },
  secondaryBtnText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '700' },

  pairRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  pairText: { flex: 1, color: Colors.textPrimary, fontSize: 17, fontWeight: '800' },
  pairAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pairActionText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },

  loveCard: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(217,148,242,0.35)', padding: 18, marginBottom: 24, gap: 4 },
  loveTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  loveBadge: { color: Colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  shareBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(237,228,253,0.10)' },
  loveName: { color: Colors.textPrimary, fontSize: 30, fontFamily: Fonts.display, fontWeight: '800', letterSpacing: -0.7 },
  loveCountry: { color: Colors.textMuted, fontSize: 13, marginBottom: 8 },

  sectionLabel: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 22, fontWeight: '800', letterSpacing: -0.45, marginBottom: 12 },
  list: { gap: 12 },
  sharedCard: { gap: 8 },
  sharedTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { color: Colors.textMuted, fontSize: 15, fontWeight: '900', width: 16 },
  sharedName: { color: Colors.textPrimary, fontSize: 19, fontFamily: Fonts.display, fontWeight: '800' },
  sharedCountry: { color: Colors.textMuted, fontSize: 12 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 28 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  personText: { color: Colors.textSecondary, fontSize: 13 },
});
