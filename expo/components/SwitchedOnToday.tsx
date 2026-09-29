import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Zap, CalendarClock, ChevronRight, MapPin } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import GlassCard from '@/components/GlassCard';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { THEMES, placesForTheme, type Theme } from '@/services/places';
import { birthMomentFromProfile } from '@/services/places-birth';
import type { HoroscopeProfileInput } from '@/services/personal-horoscope';
import { placeTiming, describeWindow, formatWindow, type TimingWindow } from '@/services/places-timing';

const SHORT: Record<Theme, string> = { love: 'Love', career: 'Career', home: 'Home', luck: 'Luck', drive: 'Drive' };

interface Row {
  theme: Theme;
  window: TimingWindow;
  cause: string;
  city: string | null;
}

/**
 * Ties the day's sky to the user's own map: which of their life areas is switched on
 * right now, and the city on their lines where it is loudest. With nothing live, it
 * names the next one to come. Needs an exact birth moment; renders nothing without it.
 */
export default function SwitchedOnToday({ profile }: { profile: HoroscopeProfileInput | null | undefined }) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const dayKey = new Date().toDateString();

  const { live, next } = useMemo(() => {
    const birth = birthMomentFromProfile(profile);
    if (!birth) return { live: [] as Row[], next: null as Row | null };
    const rows = THEMES.map((t) => {
      const timing = placeTiming(birth, t.planet);
      const top = placesForTheme(birth, t.key, 1)[0];
      return { t, timing, city: top ? top.city.name : null };
    });
    const liveRows = rows
      .filter((r) => r.timing.now)
      .sort((a, b) => b.timing.now!.score - a.timing.now!.score)
      .slice(0, 3)
      .map((r) => ({ theme: r.t.key, window: r.timing.now!, cause: describeWindow(r.timing.now!, r.t.planet), city: r.city }));
    const soonest = rows
      .filter((r) => r.timing.next)
      .sort((a, b) => a.timing.next!.start.getTime() - b.timing.next!.start.getTime())[0];
    return {
      live: liveRows,
      next: soonest
        ? { theme: soonest.t.key, window: soonest.timing.next!, cause: describeWindow(soonest.timing.next!, soonest.t.planet), city: soonest.city }
        : null,
    };
    // Only the fields the calculation reads, plus the day: windows move with the date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.birth_date, profile?.timezone, profile?.quiz_data?.birth_hour, profile?.quiz_data?.birth_minute, dayKey]);

  if (live.length === 0 && !next) return null;

  return (
    <Pressable
      onPress={() => router.push('/(app)/(home)')}
      accessibilityRole="button"
      accessibilityLabel="Open your Power Places"
      style={({ pressed }) => pressed && styles.pressed}
    >
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{live.length > 0 ? 'SWITCHED ON TODAY' : 'NEXT TO SWITCH ON'}</Text>
          <ChevronRight size={16} color={Colors.textMuted} />
        </View>
        {(live.length > 0 ? live : [next!]).map((row) => (
          <View key={row.theme} style={styles.row}>
            <View style={[styles.icon, live.length > 0 && styles.iconLive]}>
              {live.length > 0 ? <Zap size={14} color={Colors.accent} /> : <CalendarClock size={14} color={Colors.purpleLight} />}
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>
                {SHORT[row.theme]} places ·{' '}
                {live.length > 0
                  ? `until ${formatWindow({ start: row.window.end, end: row.window.end })}`
                  : formatWindow(row.window)}
              </Text>
              <Text style={styles.cause}>{row.cause}</Text>
              {row.city && (
                <View style={styles.cityRow}>
                  <MapPin size={11} color={Colors.textMuted} />
                  <Text style={styles.city}>Loudest in {row.city}</Text>
                </View>
              )}
            </View>
          </View>
        ))}
      </GlassCard>
    </Pressable>
  );
}

const createStyles = () => StyleSheet.create({
  pressed: { opacity: 0.8 },
  card: { marginBottom: 16, gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: Colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(192,154,235,0.16)' },
  iconLive: { backgroundColor: 'rgba(217,148,242,0.18)' },
  copy: { flex: 1, gap: 2 },
  title: { color: Colors.textPrimary, fontSize: 15, fontFamily: Fonts.display, fontWeight: '800' },
  cause: { color: Colors.textSecondary, fontSize: 13 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  city: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
});
