import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import CosmicBackground from '@/components/CosmicBackground';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setSkipAuth } = useAuth();
  const artwork = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(artwork, { toValue: 1, friction: 10, tension: 48, useNativeDriver: true }),
      Animated.timing(content, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, [artwork, content]);

  const preview = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSkipAuth(true);
    router.replace('/(app)/(home)');
  };

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.wordmarkRow}>
            <View style={styles.brandPulse} />
            <Text style={styles.wordmark}>ASTROLYFE</Text>
          </View>
          <View style={styles.privatePill}>
            <LockKeyhole size={10} color={Colors.purpleLight} />
            <Text style={styles.privateText}>PRIVATE BY DESIGN</Text>
          </View>
        </View>

        <Animated.View
          style={[
            styles.visual,
            {
              opacity: artwork,
              transform: [
                { scale: artwork.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                { translateY: artwork.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.outerGlow} />
          <View style={styles.imageFrame}>
            <Image source={require('../../assets/images/icon.png')} style={styles.eyeImage} resizeMode="cover" accessible accessibilityLabel="AstroLyfe cosmic eye" />
            <LinearGradient
              colors={['rgba(1,1,2,0)', 'rgba(1,1,2,0.08)', Colors.bg]}
              locations={[0, 0.68, 1]}
              style={StyleSheet.absoluteFillObject}
            />
          </View>
          <View style={styles.signal}>
            <Sparkles size={13} color={Colors.lavenderIce} />
            <Text style={styles.signalText}>YOUR COSMIC PROFILE IS UNIQUE</Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: content,
              transform: [{ translateY: content.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            },
          ]}
        >
          <Text style={styles.eyebrow}>PERSONAL ASTROLOGY, REIMAGINED</Text>
          <Text style={styles.title}>Your universe.{'\n'}Decoded.</Text>
          <Text style={styles.subtitle}>
            Daily guidance, relationship insight, and your complete birth chart—built around you, not a generic horoscope.
          </Text>
        </Animated.View>

        <Animated.View style={[styles.actions, { opacity: content }]}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/onboarding')}
            testID="get-started-btn"
            accessibilityRole="button"
            accessibilityLabel="Build my cosmic profile"
          >
            <LinearGradient
              colors={[Colors.purple, '#9C47D2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              <Text style={styles.primaryText}>Build my cosmic profile</Text>
              <ArrowRight size={19} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => router.push('/(auth)/login')}
            testID="login-btn"
            accessibilityRole="button"
            accessibilityLabel="Sign in to AstroLyfe"
          >
            <Text style={styles.secondaryText}>Sign in</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.previewButton, pressed && { opacity: 0.65 }]}
            onPress={preview}
            testID="skip-btn"
            accessibilityRole="button"
            accessibilityLabel="Explore AstroLyfe as a guest"
          >
            <Text style={styles.previewText}>Explore as a guest</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    minHeight: 52,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  brandPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  wordmark: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 2.4,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  privateText: {
    color: Colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  visual: {
    height: 238,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginHorizontal: -20,
  },
  outerGlow: {
    position: 'absolute',
    width: 260,
    height: 160,
    borderRadius: 130,
    backgroundColor: 'rgba(121,76,185,0.20)',
    shadowColor: Colors.accent,
    shadowOpacity: 0.38,
    shadowRadius: 44,
  },
  imageFrame: {
    width: '100%',
    height: 238,
    overflow: 'hidden',
  },
  eyeImage: {
    width: '100%',
    height: 238,
    transform: [{ scale: 1.05 }],
  },
  signal: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.26)',
    backgroundColor: 'rgba(9,5,27,0.88)',
  },
  signalText: {
    color: Colors.purpleSoft,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  content: {
    paddingTop: 16,
  },
  eyebrow: {
    color: Colors.purpleLight,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  title: {
    color: Colors.textPrimary,
    fontFamily: Fonts.display,
    fontSize: 43,
    fontWeight: '800',
    lineHeight: 45,
    letterSpacing: -1.6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 13,
    maxWidth: 350,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: 16,
    paddingBottom: 12,
    gap: 9,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.purple,
    shadowOpacity: 0.38,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryGradient: {
    minHeight: 56,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.22)',
    backgroundColor: 'rgba(16,9,39,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  previewButton: {
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
