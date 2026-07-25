import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, LockKeyhole } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import CosmicBackground from '@/components/CosmicBackground';
import BrandMark from '@/components/BrandMark';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setSkipAuth } = useAuth();
  const mark = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(mark, { toValue: 1, friction: 9, tension: 52, useNativeDriver: true }),
      Animated.timing(content, { toValue: 1, duration: 420, useNativeDriver: true }),
    ]).start();
  }, [content, mark]);

  const preview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSkipAuth(true);
    router.replace('/(app)/(home)');
  };

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.masthead}>
          <View style={styles.brandRule} />
          <Text style={styles.brand}>ASTROLYFE</Text>
          <Text style={styles.edition}>A PERSONAL ALMANAC</Text>
        </View>

        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.markWrap,
              {
                opacity: mark,
                transform: [
                  { scale: mark },
                  { rotate: mark.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <BrandMark size={136} />
            <View style={styles.issueBadge}>
              <Text style={styles.issueNumber}>{String(new Date().getDate()).padStart(2, '0')}</Text>
              <Text style={styles.issueMonth}>{new Date().toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={{
              opacity: content,
              transform: [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }}
          >
            <Text style={styles.eyebrow}>YOUR SKY, MADE PERSONAL</Text>
            <Text style={styles.title}>The sky is vast.{'\n'}Your reading shouldn&apos;t be.</Text>
            <Text style={styles.subtitle}>
              A thoughtful daily guide shaped by your birth chart, your questions, and the moment you&apos;re living.
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.actions, { opacity: content }]}>
          <View style={styles.trustLine}>
            <LockKeyhole size={13} color={Colors.textMuted} />
            <Text style={styles.trustText}>Your birth details stay private and editable.</Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/onboarding')}
            testID="get-started-btn"
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Read my sky</Text>
            <ArrowRight size={19} color={Colors.paperInk} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/login')}
            testID="login-btn"
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>I already have an account</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.previewButton, pressed && { opacity: 0.65 }]}
            onPress={preview}
            testID="skip-btn"
            accessibilityRole="button"
          >
            <Text style={styles.previewText}>Preview today&apos;s edition</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  masthead: {
    paddingTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRule: {
    width: 24,
    height: 1,
    backgroundColor: Colors.gold,
    marginRight: 10,
  },
  brand: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2.3,
  },
  edition: {
    marginLeft: 'auto',
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
  },
  markWrap: {
    alignSelf: 'flex-end',
    marginBottom: 28,
    marginRight: 8,
  },
  issueBadge: {
    position: 'absolute',
    left: -64,
    bottom: 2,
    borderLeftWidth: 1,
    borderLeftColor: Colors.bgCardBorder,
    paddingLeft: 12,
  },
  issueNumber: {
    color: Colors.textPrimary,
    fontFamily: Fonts.display,
    fontSize: 30,
    lineHeight: 32,
  },
  issueMonth: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  eyebrow: {
    color: Colors.gold,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 14,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: Fonts.display,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: 18,
    maxWidth: 340,
  },
  actions: {
    paddingBottom: 20,
    gap: 10,
  },
  trustLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 4,
  },
  trustText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: {
    color: Colors.paperInk,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  previewButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: Colors.textMuted,
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
