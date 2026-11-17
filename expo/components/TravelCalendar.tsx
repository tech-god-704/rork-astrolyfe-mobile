import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { MapPin, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import GlassCard from '@/components/GlassCard';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { THEME_STYLE, PLANET_THEME, THEME_LABEL_BY_PLANET } from '@/constants/placeThemes';
import { THEMES, placesForTheme, type BirthMoment, type PlacePlanet, type Theme } from '@/services/places';
import { travelCalendar, describeWindow, formatWindow } from '@/services/places-timing';

const PLANETS = THEMES.map((t) => t.planet);

/**
 * The year ahead in date order: when each life area's places are active, and the city
 * where that area is strongest. Tapping a row shows that life area on the map.
 */
export default function TravelCalendar({ birth, onPick }: { birth: BirthMoment; onPick: (theme: Theme) => void }) {
  const styles = useThemedStyles(createStyles);
  const dayKey = new Date().toDateString();

  const rows = useMemo(() => {
    const topCity = new Map<PlacePlanet, string | null>();
    return travelCalendar(birth, PLANETS, new Date(), 365, 5).map((entry) => {
      if (!topCity.has(entry.natal)) {
        topCity.set(entry.natal, placesForTheme(birth, PLANET_THEME[entry.natal], 1)[0]?.city.name ?? null);
      }
      return { ...entry, city: topCity.get(entry.natal) ?? null };
    });
    // dayKey is deliberately a dependency: the windows move with today's date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [birth, dayKey]);

  if (rows.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>Your travel calendar</Text>
      <Text style={styles.sectionNote}>When each part of your life is most active over the next year.</Text>
      <GlassCard style={styles.card}>
        {rows.map((row, i) => {
          const theme = PLANET_THEME[row.natal];
          const { color, Icon } = THEME_STYLE[theme];
          const when = row.live
            ? `Now · until ${formatWindow({ start: row.window.end, end: row.window.end })}`
            : formatWindow(row.window);
          const area = THEME_LABEL_BY_PLANET[row.natal];
          return (
            <Pressable
              key={`${row.natal}-${row.window.start.getTime()}`}
              onPress={() => onPick(theme)}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`${when}. ${area} places. ${describeWindow(row.window, row.natal)}.${row.city ? ` Strongest in ${row.city}.` : ''} Show on map.`}
            >
              <View style={[styles.icon, { backgroundColor: `${color}22` }]}>
                <Icon size={15} color={color} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.when}>{when}</Text>
                <Text style={styles.what}>{describeWindow(row.window, row.natal)}</Text>
                {row.city && (
                  <View style={styles.cityRow}>
                    <MapPin size={11} color={Colors.textMuted} />
                    <Text style={styles.city}>Strongest in {row.city}</Text>
                  </View>
                )}
              </View>
              <ChevronRight size={15} color={Colors.textMuted} />
            </Pressable>
          );
        })}
      </GlassCard>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  wrap: { marginBottom: 30 },
  sectionLabel: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 22, fontWeight: '800', letterSpacing: -0.45, marginBottom: 4 },
  sectionNote: { color: Colors.textSecondary, fontSize: 14, marginBottom: 12 },
  card: { paddingVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.bgCardBorder },
  pressed: { opacity: 0.75 },
  icon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 2 },
  when: { color: Colors.textPrimary, fontSize: 15, fontFamily: Fonts.display, fontWeight: '800' },
  what: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  city: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
});
