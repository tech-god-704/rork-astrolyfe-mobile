import React, { useCallback, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Sparkles, Compass, Heart, Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import CosmicBackground from '@/components/CosmicBackground';
import BrandMark from '@/components/BrandMark';
import { useThemedStyles } from '@/providers/ThemeProvider';

/**
 * One-time welcome tour, shown between login and the tab bar for any account whose
 * onboarding_completed flag is not yet true — see the AuthGate in app/_layout.tsx.
 *
 * The column already existed on the profiles collection with nothing reading or
 * writing it, so every first login previously skipped straight to the home tab with
 * no introduction at all. This is a real gap for the common case: a customer who
 * created their password on the web checkout, not in the app, is logging into an
 * interface they have genuinely never seen before.
 *
 * Icons reuse the exact ones the tab bar uses for the same destinations (Compass for
 * Chart, Heart for Compatibility, Sun for Forecast) so the promise made here and the
 * icon the user later taps are the same shape, not a coincidentally similar one.
 */

interface Step {
  icons: (typeof Sparkles)[];
  eyebrow: string;
  title: string;
  copy: string;
}

// Icons match the exact ones the tab bar uses for the same destinations (Compass for
// Chart, Sun for Forecast, Heart for Match), so the promise made here and the icon a
// user later taps are the same shape, not a coincidentally similar one.
const STEPS: Step[] = [
  {
    icons: [Sparkles],
    eyebrow: "You're in",
    title: 'Welcome to AstroLyfe',
    copy: 'This is where your soulmate portrait and reading live, plus tools to explore your own chart any time.',
  },
  {
    icons: [Sparkles],
    eyebrow: 'Your reveal',
    title: 'Your reading arrives here',
    copy: "If you just purchased, your portrait and five-part reading are being prepared and will appear on Insights the moment they're ready — you'll also get an email.",
  },
  {
    icons: [Compass, Sun, Heart],
    eyebrow: 'Explore',
    title: 'Chart, Forecast & Match',
    copy: 'Your birth chart, a daily forecast built from your own transits, and compatibility with anyone you have in mind.',
  },
  {
    icons: [Sparkles],
    eyebrow: "Let's go",
    title: 'Everything is ready',
    copy: 'Explore at your own pace. You can always find your reading again from the Insights tab.',
  },
];

export default function WelcomeTourScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  const animateTo = useCallback((next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setStep(next);
  }, [fade]);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      if (profile?.email) {
        // Mirrors the update pattern already used in the Profile tab: filter by email,
        // since PocketBase updates by record id and the adapter resolves that lookup.
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('email', profile.email);
        if (error) throw error;
        await refreshProfile();
      }
    } catch {
      // Never trap someone on the tour because a single write failed — worst case they
      // see it again next login, which is a minor annoyance, not a broken app.
    } finally {
      router.replace('/(app)/(home)');
    }
  }, [finishing, profile?.email, refreshProfile, router]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.top}>
          <BrandMark size={40} />
          <Pressable
            onPress={finish}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.content, { opacity: fade }]}>
          <View style={styles.iconRow}>
            {current.icons.map((FeatureIcon, i) => {
              const ringSize = current.icons.length > 1 ? 56 : 76;
              return (
                <View key={i} style={[styles.iconRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
                  <FeatureIcon size={current.icons.length > 1 ? 22 : 30} color={Colors.lavender} strokeWidth={1.8} />
                </View>
              );
            })}
          </View>
          <Text style={styles.eyebrow}>{current.eyebrow}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.copy}>{current.copy}</Text>
        </Animated.View>

        <View style={styles.bottom}>
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <Pressable
            onPress={isLast ? finish : () => animateTo(step + 1)}
            disabled={finishing}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, finishing && styles.ctaDisabled]}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Enter AstroLyfe' : 'Next'}
          >
            <Text style={styles.ctaText}>{isLast ? 'Enter AstroLyfe' : 'Next'}</Text>
            <ArrowRight size={18} color={Colors.black} strokeWidth={2.4} />
          </Pressable>
        </View>
      </SafeAreaView>
    </CosmicBackground>
  );
}

const createStyles = () => StyleSheet.create({
  safeArea: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  skip: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(218,200,242,0.62)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  iconRing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150,98,198,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.4)',
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: Colors.lavender,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.paperInk,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 34,
  },
  copy: {
    fontFamily: Fonts.body,
    fontSize: 15.5,
    lineHeight: 23,
    color: 'rgba(218,200,242,0.82)',
    textAlign: 'center',
    maxWidth: 320,
  },
  bottom: { paddingBottom: 20, gap: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(218,200,242,0.22)',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.lavender,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: Colors.lavender,
  },
  ctaPressed: { opacity: 0.88 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.black,
  },
});
