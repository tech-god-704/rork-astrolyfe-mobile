import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RotateCcw, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import AppBackground from '@/components/AppBackground';
import BrandMark from '@/components/BrandMark';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useThemedStyles } from '@/providers/ThemeProvider';

/**
 * No pricing, no "buy"/"unlock" CTA, no link to any purchase flow — deliberately.
 * Apple's Guideline 3.1.1 requires In-App Purchase for subscriptions unlocked inside
 * the app; this app doesn't sell anything in-app at all today (accounts and
 * subscriptions are both created on the web funnel), so this screen only ever
 * explains account status and offers Restore/Sign out. Do not add a purchase button
 * or external checkout link here without also adding real StoreKit/IAP — a prominent
 * CTA that opens a browser to pay is exactly the pattern Apple review rejects.
 */
export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  const { isSubscribed, isLoading, refreshProfile, signOut } = useAuth();
  const [restoring, setRestoring] = useState(false);

  if (isSubscribed) return <>{children}</>;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <AppBackground />
        <BrandMark size={84} />
        <Text style={styles.loadingText}>Checking your access…</Text>
      </View>
    );
  }

  const restore = async () => {
    setRestoring(true);
    try {
      await refreshProfile();
    } finally {
      setRestoring(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topline}>
            <Text style={styles.brand}>ASTROLYFE</Text>
            <Text style={styles.issue}>ACCOUNT STATUS</Text>
          </View>

          <View style={styles.mark}>
            <BrandMark size={112} />
          </View>

          <Text style={styles.eyebrow}>NO ACTIVE SUBSCRIPTION</Text>
          <Text style={styles.title}>We couldn&apos;t find an active subscription on this account.</Text>
          <Text style={styles.subtitle}>
            If you recently subscribed, it can take a minute to sync — try restoring below. Otherwise, your
            subscription is managed from wherever you originally signed up.
          </Text>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>WHAT AN ACTIVE ACCOUNT INCLUDES</Text>
            {[
              'Your complete daily, weekly, and monthly readings',
              'Birth chart patterns explained in plain language',
              'Compatibility guidance and deeper personal reports',
            ].map((feature, index) => (
              <View key={feature} style={[styles.feature, index > 0 && styles.featureBorder]}>
                <View style={styles.check}>
                  <Sparkles size={12} color={Colors.paperInk} strokeWidth={2.4} />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.restoreBtn, pressed && !restoring && styles.pressed]}
            onPress={restore}
            disabled={restoring}
            accessibilityRole="button"
            accessibilityLabel="Restore existing access"
            accessibilityState={{ disabled: restoring, busy: restoring }}
          >
            {restoring ? (
              <ActivityIndicator color={Colors.paperInk} size="small" />
            ) : (
              <RotateCcw size={16} color={Colors.paperInk} />
            )}
            <Text style={styles.restoreBtnText}>Restore my access</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
            onPress={signOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 30 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bg, gap: 18 },
  loadingText: { color: Colors.textMuted, fontSize: 13, letterSpacing: 0.5 },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: Colors.textPrimary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  issue: { color: Colors.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  mark: { alignItems: 'center', marginTop: 32, marginBottom: 28 },
  eyebrow: { color: Colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginBottom: 12 },
  title: { color: Colors.textPrimary, fontFamily: Fonts.display, fontSize: 38, lineHeight: 43, letterSpacing: -0.8 },
  subtitle: { color: Colors.textSecondary, fontSize: 15, lineHeight: 23, marginTop: 14, marginBottom: 24 },
  preview: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.bgCardBorder, marginBottom: 22 },
  previewLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5, paddingVertical: 13 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  featureBorder: { borderTopWidth: 1, borderTopColor: 'rgba(218,200,242,0.08)' },
  check: { width: 23, height: 23, borderRadius: 12, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
  restoreBtn: {
    minHeight: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.purple,
  },
  restoreBtnText: { color: Colors.paperInk, fontSize: 16, fontWeight: '800' },
  signOut: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  signOutText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
});
