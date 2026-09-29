import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CalendarClock, Zap } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { formatWindow, type TimingWindow } from '@/services/places-timing';

/**
 * One line on a place card saying when that place is switched on: now (with the date it
 * fades), or the strongest upcoming window. Renders nothing when neither exists.
 */
export default function TimingNote({
  now,
  best,
  cause,
  label = 'Best time to go',
}: {
  now: TimingWindow | null;
  best: TimingWindow | null;
  /** Plain-English reason for the window shown, e.g. "Jupiter flows with your Venus". */
  cause: (w: TimingWindow) => string;
  label?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const w = now ?? best;
  if (!w) return null;
  const live = w === now;
  const until = formatWindow({ start: w.end, end: w.end });

  return (
    <View
      style={[styles.row, live && styles.rowLive]}
      accessible
      accessibilityLabel={live ? `Switched on now, until ${until}. ${cause(w)}.` : `${label}: ${formatWindow(w)}. ${cause(w)}.`}
    >
      <View style={[styles.icon, live && styles.iconLive]}>
        {live ? <Zap size={13} color={Colors.accent} /> : <CalendarClock size={13} color={Colors.purpleLight} />}
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>
          {live ? `Switched on now · until ${until}` : `${label}: ${formatWindow(w)}`}
        </Text>
        <Text style={styles.cause}>{cause(w)}</Text>
      </View>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 14, backgroundColor: 'rgba(192,154,235,0.10)', borderWidth: 1, borderColor: 'rgba(192,154,235,0.18)' },
  rowLive: { backgroundColor: 'rgba(217,148,242,0.12)', borderColor: 'rgba(217,148,242,0.34)' },
  icon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(192,154,235,0.16)' },
  iconLive: { backgroundColor: 'rgba(217,148,242,0.18)' },
  copy: { flex: 1, gap: 1 },
  title: { color: Colors.textPrimary, fontSize: 13, fontWeight: '800' },
  cause: { color: Colors.textMuted, fontSize: 12 },
});
