import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Line, G, Text as SvgText } from 'react-native-svg';
import { Navigation, Search, X, MapPin, Clock3, Pencil } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import GlassCard from '@/components/GlassCard';
import { useAuth } from '@/providers/AuthProvider';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { homeCityKey } from '@/constants/storageKeys';
import { THEME_STYLE, PLANET_THEME, THEME_LABEL_BY_PLANET } from '@/constants/placeThemes';
import { CITIES, searchCities, type City } from '@/data/cities';
import { THEMES, formatMiles, type BirthMoment, type PlacePlanet } from '@/services/places';
import {
  planetDirections,
  citiesOnLine,
  compassPoint,
  compassWords,
  nearestCity,
  localTimeIn,
  assignRings,
  mainDirection,
  type PlanetDirection,
} from '@/services/compass';

const GLYPH: Record<PlacePlanet, string> = {
  Sun: '☉',
  Moon: '☽',
  Venus: '♀︎',
  Mars: '♂︎',
  Jupiter: '♃',
};

/** Birthplace counts as "home" by default only if one of our cities is this close. */
const DEFAULT_HOME_MAX_KM = 300;

const SIZE = 300;
const C = SIZE / 2;
const R = 122;
const MARKER = 14;
const LABEL_FONT = Platform.OS === 'web' ? Fonts.body : undefined;

const point = (azimuth: number, r: number) => {
  const a = (azimuth * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
};

/**
 * "From home": which compass direction each life area lies in from where the person
 * lives, and the real cities that way, with distance and their local time now.
 */
export default function HomeCompass({ birth, birthLat, birthLon }: { birth: BirthMoment; birthLat?: number | null; birthLon?: number | null }) {
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const email = user?.email ?? '';

  const fallback = useMemo(() => {
    if (birthLat == null || birthLon == null) return null;
    const near = nearestCity(birthLat, birthLon);
    return near && near.distanceKm <= DEFAULT_HOME_MAX_KM ? near.city : null;
  }, [birthLat, birthLon]);

  const [saved, setSaved] = useState<City | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [changing, setChanging] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!email) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(homeCityKey(email))
      .then((name) => {
        if (!cancelled && name) setSaved(CITIES.find((c) => c.name === name) ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const home = saved ?? fallback;

  const matches = useMemo(() => searchCities(query), [query]);

  const pickHome = async (city: City) => {
    Haptics.selectionAsync().catch(() => {});
    setSaved(city);
    setChanging(false);
    setQuery('');
    if (email) await AsyncStorage.setItem(homeCityKey(email), city.name).catch(() => {});
  };

  // Ordered like the life-area chips on the world map.
  const directions = useMemo(() => {
    if (!home) return [];
    const all = planetDirections(birth, home);
    return THEMES.map((t) => all.find((d) => d.planet === t.planet)!);
  }, [birth, home]);

  // Read the clock once per render pass, so every row agrees.
  const now = new Date();

  const showPicker = loaded && (changing || !home);

  return (
    <View>
      <GlassCard style={styles.homeCard}>
        {home && !changing ? (
          <View style={styles.homeRow}>
            <View style={styles.homeIcon}>
              <Navigation size={16} color={Colors.accent} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.homeLabel}>FROM HOME</Text>
              <Text style={styles.homeName}>
                {home.name}, {home.country}
              </Text>
            </View>
            <Pressable
              onPress={() => setChanging(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.changeBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Change where you live"
            >
              <Pencil size={13} color={Colors.textMuted} />
              <Text style={styles.changeText}>Change</Text>
            </Pressable>
          </View>
        ) : null}

        {showPicker && (
          <View style={styles.picker}>
            <Text style={styles.pickerTitle}>Where do you live now?</Text>
            <Text style={styles.pickerText}>
              Your directions are measured from home. Pick the nearest big city; it stays on this phone.
            </Text>
            <View style={styles.searchBox}>
              <Search size={16} color={Colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search a city"
                placeholderTextColor={Colors.textMuted}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="words"
                accessibilityLabel="Search the city you live in"
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear search">
                  <X size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            </View>
            {matches.map((c) => (
              <Pressable
                key={c.name}
                onPress={() => pickHome(c)}
                style={({ pressed }) => [styles.matchRow, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${c.country}`}
              >
                <MapPin size={14} color={Colors.purpleLight} />
                <Text style={styles.matchName}>{c.name}</Text>
                <Text style={styles.matchCountry}>{c.country}</Text>
              </Pressable>
            ))}
            {query.trim().length >= 2 && matches.length === 0 && (
              <Text style={styles.pickerText}>Not on our map yet. Try the nearest big city.</Text>
            )}
            {home && (
              <Pressable onPress={() => { setChanging(false); setQuery(''); }} style={styles.cancel} accessibilityRole="button">
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            )}
          </View>
        )}
      </GlassCard>

      {home && (
        <>
          <CompassRose directions={directions} homeName={home.name} />
          <View style={styles.key}>
            {directions.map((d) => (
              <View key={d.planet} style={styles.keyItem}>
                <Text style={[styles.keyGlyph, { color: THEME_STYLE[PLANET_THEME[d.planet]].color }]}>{GLYPH[d.planet]}</Text>
                <Text style={styles.keyText}>{THEME_LABEL_BY_PLANET[d.planet]}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.roseNote}>
            Each colour is one part of your life. Its line runs straight through {home.name}, both ways; the bright end
            points to where its planet was when you were born.
          </Text>

          <View style={styles.list}>
            {directions.map((d) => (
              <DirectionCard key={d.planet} home={home} dir={d} now={now} styles={styles} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function CompassRose({ directions, homeName }: { directions: PlanetDirection[]; homeName: string }) {
  // Planets a few degrees apart would sit on top of each other at the rim. Markers go on
  // one of three rings: the outermost ring with room, judged by actual on-screen
  // distance. With all three crowded (a tight stellium), the ring with the most room
  // wins — markers may touch, but every one stays on its own true bearing and never
  // crosses the centre.
  const placed = useMemo(() => {
    const radii = assignRings(
      directions.map((d) => d.azimuth),
      [R - MARKER - 4, R - MARKER * 3 - 8, R - MARKER * 5 - 12],
      MARKER * 2 + 2,
    );
    return directions.map((dir, i) => ({ dir, r: radii[i] }));
  }, [directions]);

  const summary = directions
    .map((d) => `${THEME_LABEL_BY_PLANET[d.planet]}: ${compassWords(d.azimuth)} or ${compassWords(d.azimuth + 180)}`)
    .join(', ');

  return (
    <View style={roseStyles.wrap} accessible accessibilityRole="image" accessibilityLabel={`Compass from ${homeName}. ${summary}.`}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <Circle cx={C} cy={C} r={R} fill="rgba(9,5,27,0.72)" stroke="rgba(192,154,235,0.35)" strokeWidth={1.2} />
        <Circle cx={C} cy={C} r={R * 0.66} fill="none" stroke="rgba(192,154,235,0.14)" strokeWidth={1} />
        <Circle cx={C} cy={C} r={R * 0.33} fill="none" stroke="rgba(192,154,235,0.10)" strokeWidth={1} />
        {Array.from({ length: 16 }, (_, i) => {
          const az = i * 22.5;
          const major = i % 4 === 0;
          const a = point(az, R);
          const b = point(az, R - (major ? 10 : 5));
          return <Line key={`t${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(237,228,253,0.45)" strokeWidth={major ? 1.6 : 1} />;
        })}
        {(['N', 'E', 'S', 'W'] as const).map((p, i) => {
          const at = point(i * 90, R + 14);
          return (
            <SvgText
              key={p}
              x={at.x}
              y={at.y + 4.5}
              fontSize={13}
              fontWeight="800"
              fontFamily={LABEL_FONT}
              fill={p === 'N' ? Colors.accent : Colors.textSecondary}
              textAnchor="middle"
            >
              {p}
            </SvgText>
          );
        })}
        {placed.map(({ dir, r }) => {
          const color = THEME_STYLE[PLANET_THEME[dir.planet]].color;
          const end = point(dir.azimuth, r);
          const far = point(dir.azimuth + 180, R - 4);
          return (
            <G key={dir.planet}>
              <Line x1={C} y1={C} x2={far.x} y2={far.y} stroke={color} strokeWidth={1} opacity={0.28} />
              <Line
                x1={C}
                y1={C}
                x2={end.x}
                y2={end.y}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                opacity={0.9}
              />
              <Circle cx={end.x} cy={end.y} r={MARKER} fill={Colors.bg} stroke={color} strokeWidth={2} />
              <SvgText x={end.x} y={end.y + 5} fontSize={15} fill={color} textAnchor="middle" fontWeight="700">
                {GLYPH[dir.planet]}
              </SvgText>
            </G>
          );
        })}
        <Circle cx={C} cy={C} r={5} fill={Colors.textPrimary} />
        <Circle cx={C} cy={C} r={9} fill="none" stroke="rgba(237,228,253,0.4)" strokeWidth={1} />
      </Svg>
    </View>
  );
}

function DirectionCard({
  home,
  dir,
  now,
  styles,
}: {
  home: City;
  dir: PlanetDirection;
  now: Date;
  styles: ReturnType<typeof createStyles>;
}) {
  const theme = PLANET_THEME[dir.planet];
  const { color, Icon } = THEME_STYLE[theme];
  const blurb = THEMES.find((t) => t.key === theme)!.blurb;
  const cities = useMemo(() => citiesOnLine(home, dir.azimuth), [home, dir.azimuth]);

  return (
    <GlassCard style={styles.dirCard}>
      <View style={[styles.dirAccent, { backgroundColor: color }]} />
      <View style={styles.dirTop}>
        <View style={[styles.dirIcon, { backgroundColor: `${color}22` }]}>
          <Icon size={16} color={color} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.dirTitle}>
            {THEME_LABEL_BY_PLANET[dir.planet]}: head {mainDirection(dir.azimuth)} or {mainDirection(dir.azimuth + 180)}
          </Text>
          <Text style={styles.dirMeta}>
            Your {dir.planet} line from {home.name}. Cities on it, nearest first:
          </Text>
        </View>
      </View>
      <Text style={styles.dirBlurb}>{blurb}</Text>
      {cities.length === 0 ? (
        <Text style={styles.dirEmpty}>This line crosses mostly open ocean — no big cities on it from {home.name}.</Text>
      ) : (
        <View style={styles.cityList}>
          {cities.map(({ city, distanceKm, bearing }) => {
            const time = localTimeIn(city.tz, now);
            return (
              <View
                key={city.name}
                style={styles.cityRow}
                accessible
                accessibilityLabel={`${city.name}, ${city.country}, ${formatMiles(distanceKm)} ${compassWords(bearing)}${time ? `, ${time} there now` : ''}`}
              >
                <MapPin size={13} color={color} />
                <View style={styles.flex}>
                  <Text style={styles.cityName}>{city.name}</Text>
                  <Text style={styles.cityCountry}>{city.country}</Text>
                </View>
                <View style={styles.cityRight}>
                  <Text style={styles.cityDistance}>
                    {formatMiles(distanceKm)} <Text style={styles.cityPoint}>{compassPoint(bearing)}</Text>
                  </Text>
                  {time && (
                    <View style={styles.timeRow}>
                      <Clock3 size={10} color={Colors.textMuted} />
                      <Text style={styles.cityTime}>{time}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
}

const roseStyles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 340, aspectRatio: 1, alignSelf: 'center', marginTop: 6 },
});

const createStyles = () => StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.78 },

  homeCard: { marginBottom: 8 },
  homeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  homeIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,148,242,0.16)' },
  homeLabel: { color: Colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  homeName: { color: Colors.textPrimary, fontSize: 17, fontFamily: Fonts.display, fontWeight: '800', marginTop: 2 },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(237,228,253,0.08)' },
  changeText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },

  picker: { gap: 10 },
  pickerTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.display, fontWeight: '800' },
  pickerText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.bgInputBorder, backgroundColor: Colors.bgInput, borderRadius: 14, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 15, paddingVertical: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.bgCardBorder },
  matchName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  matchCountry: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  cancel: { alignSelf: 'flex-start', paddingVertical: 6 },
  cancelText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },

  key: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 6 },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  keyGlyph: { fontSize: 15, fontWeight: '700' },
  keyText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700' },
  roseNote: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 8, marginBottom: 18, paddingHorizontal: 10 },

  list: { gap: 12, marginBottom: 8 },
  dirCard: { gap: 10, overflow: 'hidden' },
  dirAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  dirTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dirIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dirTitle: { color: Colors.textPrimary, fontSize: 18, fontFamily: Fonts.display, fontWeight: '800' },
  dirMeta: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  dirBlurb: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  dirEmpty: { color: Colors.textMuted, fontSize: 13, lineHeight: 19 },
  cityList: { gap: 2 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.bgCardBorder },
  cityName: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700' },
  cityCountry: { color: Colors.textMuted, fontSize: 12 },
  cityRight: { alignItems: 'flex-end' },
  cityDistance: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  cityPoint: { color: Colors.textMuted, fontSize: 11, fontWeight: '800' },
  cityTime: { color: Colors.textMuted, fontSize: 11, fontWeight: '600' },
});
