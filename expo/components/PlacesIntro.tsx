import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Globe, Navigation, CalendarClock, Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useThemedStyles } from '@/providers/ThemeProvider';

const STEPS = [
  {
    Icon: Globe,
    title: 'Where',
    text: 'Your map shows the cities where love, career, home, luck and drive are strongest for you.',
  },
  {
    Icon: Navigation,
    title: 'Which way',
    text: 'Switch to From home to see which direction to head from where you live, and the cities that way.',
  },
  {
    Icon: CalendarClock,
    title: 'When',
    text: 'Dates show when each place is most active for you, worked out from where the planets really are.',
  },
] as const;

/**
 * Shown once, at the top of Places, so a first-time user (or an App Reviewer) knows what
 * the screen is for before scrolling: where, which way, and when.
 */
export default function PlacesIntro({ onDone }: { onDone: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <LinearGradient
      colors={[Colors.deepViolet, Colors.heroMid, Colors.bgCardSolid]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.eyebrow}>HOW ASTROLYFE WORKS</Text>
      <Text style={styles.lead}>
        The moment you were born, each planet sat over a different spot on Earth. AstroLyfe turns that into three answers:
      </Text>
      {STEPS.map(({ Icon, title, text }, i) => (
        <View key={title} style={styles.step}>
          <View style={styles.stepIcon}>
            <Icon size={16} color={Colors.accent} />
          </View>
          <View style={styles.stepCopy}>
            <Text style={styles.stepTitle}>
              {i + 1}. {title}
            </Text>
            <Text style={styles.stepText}>{text}</Text>
          </View>
        </View>
      ))}
      <Pressable
        onPress={onDone}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Got it, hide this guide"
      >
        <Check size={16} color={Colors.paperInk} />
        <Text style={styles.buttonText}>Got it</Text>
      </Pressable>
    </LinearGradient>
  );
}

const createStyles = () => StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(217,148,242,0.35)', padding: 18, marginBottom: 22, gap: 12 },
  eyebrow: { color: Colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  lead: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(217,148,242,0.16)' },
  stepCopy: { flex: 1, gap: 2 },
  stepTitle: { color: Colors.textPrimary, fontSize: 16, fontFamily: Fonts.display, fontWeight: '800' },
  stepText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: Colors.purple, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, marginTop: 2 },
  buttonText: { color: Colors.paperInk, fontSize: 14, fontWeight: '800' },
  pressed: { opacity: 0.8 },
});
