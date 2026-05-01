import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/providers/AuthProvider';

const WEB_CHECKOUT_URL = 'https://soulmate.astrolyfe.co';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

/**
 * SubscriptionGuard — gates premium content behind an active subscription.
 *
 * Checks profile.subscription_status from the profiles table (synced by Stripe webhook).
 * Active statuses: 'active', 'trialing', 'trial', 'lifetime'
 * Admin users always pass through.
 *
 * If not subscribed, shows a paywall that links to the web checkout.
 */
export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { isSubscribed, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isSubscribed) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#2d1b69']} style={styles.gradient}>
        <View style={styles.content}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.title}>Unlock Your Soulmate Reading</Text>
          <Text style={styles.subtitle}>
            Get full access to your personalized soulmate sketch, karmic love guide, and astrology insights.
          </Text>

          <View style={styles.features}>
            <Text style={styles.featureItem}>✓  Hand-drawn soulmate portrait</Text>
            <Text style={styles.featureItem}>✓  Personality trait analysis</Text>
            <Text style={styles.featureItem}>✓  Astrological compatibility report</Text>
            <Text style={styles.featureItem}>✓  Karmic love guide</Text>
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => Linking.openURL(WEB_CHECKOUT_URL)}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaText}>Start 7-Day Trial — $1</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>Cancel anytime. No risk.</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#A78BFA',
    fontSize: 16,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 340,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: 28,
  },
  featureItem: {
    fontSize: 15,
    color: '#E5E7EB',
    marginBottom: 10,
    paddingLeft: 4,
  },
  ctaButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  disclaimer: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 12,
  },
});
