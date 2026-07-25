import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, Check, RotateCcw } from 'lucide-react-native';
import { useAuth } from '@/providers/AuthProvider';
import AppBackground from '@/components/AppBackground';
import BrandMark from '@/components/BrandMark';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';

const WEB_CHECKOUT_URL = 'https://soulmate.astrolyfe.co';

export default function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { isSubscribed, isLoading, refreshProfile } = useAuth();
  const [restoring, setRestoring] = useState(false);

  if (isSubscribed) return <>{children}</>;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <AppBackground />
        <BrandMark size={84} />
        <Text style={styles.loadingText}>Checking your edition…</Text>
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
            <Text style={styles.brand}>ASTROLYFE / FULL EDITION</Text>
            <Text style={styles.issue}>MEMBERSHIP 01</Text>
          </View>

          <View style={styles.mark}>
            <BrandMark size={112} />
          </View>

          <Text style={styles.eyebrow}>OPEN THE FULL ALMANAC</Text>
          <Text style={styles.title}>Go deeper than your sun sign.</Text>
          <Text style={styles.subtitle}>
            Turn today&apos;s forecast into a personal map for love, timing, purpose, and the patterns in your birth chart.
          </Text>

          <View style={styles.preview}>
            <Text style={styles.previewLabel}>IN YOUR FULL EDITION</Text>
            {[
              'Your complete daily, weekly, and monthly readings',
              'Birth chart patterns explained in plain language',
              'Compatibility guidance and deeper personal reports',
            ].map((feature, index) => (
              <View key={feature} style={[styles.feature, index > 0 && styles.featureBorder]}>
                <View style={styles.check}>
                  <Check size={12} color={Colors.paperInk} strokeWidth={3} />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            onPress={() => Linking.openURL(WEB_CHECKOUT_URL)}
            accessibilityRole="link"
          >
            <View>
              <Text style={styles.ctaKicker}>7-DAY INTRODUCTORY ACCESS</Text>
              <Text style={styles.ctaText}>Begin for $1</Text>
            </View>
            <ArrowUpRight size={22} color={Colors.paperInk} />
          </Pressable>
          <Text style={styles.disclaimer}>Secure checkout opens in your browser. Cancel anytime.</Text>

          <Pressable style={styles.restore} onPress={restore} disabled={restoring}>
            {restoring ? (
              <ActivityIndicator color={Colors.textMuted} size="small" />
            ) : (
              <RotateCcw size={14} color={Colors.textMuted} />
            )}
            <Text style={styles.restoreText}>I already have access</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  cta: {
    minHeight: 64,
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: Colors.gold,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ctaKicker: { color: 'rgba(254,252,255,0.68)', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  ctaText: { color: Colors.paperInk, fontSize: 19, fontWeight: '800', marginTop: 3 },
  disclaimer: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', marginTop: 10 },
  restore: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },
  restoreText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
});
