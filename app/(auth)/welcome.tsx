import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Star, ArrowRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import CosmicBackground from '@/components/CosmicBackground';

const { width: SCREEN_W } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { setSkipAuth } = useAuth();

  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleTranslateY = useRef(new Animated.Value(15)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsTranslateY = useRef(new Animated.Value(30)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo entrance with rings
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
      // Ring 2 expands
      Animated.parallel([
        Animated.timing(ring2Scale, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(ring2Opacity, { toValue: 0.15, duration: 600, useNativeDriver: true }),
      ]),
      // Title
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(titleTranslateY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      // Subtitle
      Animated.parallel([
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(subtitleTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      // Buttons
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(buttonsTranslateY, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          {/* Outer ring */}
          <Animated.View style={[styles.ring2, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
          {/* Inner ring */}
          <Animated.View style={[styles.ring1, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          {/* Logo */}
          <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <LinearGradient
              colors={[Colors.purple, Colors.indigoLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoCircle}
            >
              <Text style={styles.logoEmoji}>✦</Text>
            </LinearGradient>
          </Animated.View>

          <Animated.Text style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]}>
            AstroLyfe
          </Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity, transform: [{ translateY: subtitleTranslateY }] }]}>
            Unlock the wisdom of the stars.{'\n'}Your cosmic journey begins here.
          </Animated.Text>

          {/* Feature highlights */}
          <Animated.View style={[styles.features, { opacity: subtitleOpacity }]}>
            <View style={styles.featureItem}>
              <Star size={14} color={Colors.gold} />
              <Text style={styles.featureText}>Daily Horoscopes</Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Sparkles size={14} color={Colors.purpleLight} />
              <Text style={styles.featureText}>Natal Charts</Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Star size={14} color={Colors.accent} />
              <Text style={styles.featureText}>Compatibility</Text>
            </View>
          </Animated.View>
        </View>

        <Animated.View style={[styles.bottomSection, { opacity: buttonsOpacity, transform: [{ translateY: buttonsTranslateY }] }]}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/(auth)/onboarding')}
            testID="get-started-btn"
          >
            <LinearGradient
              colors={[Colors.purple, Colors.indigo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              <Text style={styles.primaryBtnText}>Get Started</Text>
              <ArrowRight size={20} color="#fff" />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/(auth)/login')}
            testID="login-btn"
          >
            <Text style={styles.secondaryBtnText}>Already have an account? <Text style={styles.secondaryBtnBold}>Log in</Text></Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && styles.btnPressed]}
            onPress={() => {
              setSkipAuth(true);
              router.replace('/(app)/(home)');
            }}
            testID="skip-btn"
          >
            <Text style={styles.skipBtnText}>Skip for now</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </CosmicBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoContainer: {
    marginBottom: 24,
    zIndex: 2,
  },
  logoCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 48,
    color: '#fff',
  },
  ring1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: Colors.purpleLight,
    alignSelf: 'center',
    top: '50%',
    marginTop: -120,
    zIndex: 1,
  },
  ring2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: Colors.purpleLight,
    alignSelf: 'center',
    top: '50%',
    marginTop: -150,
    zIndex: 0,
  },
  title: {
    fontSize: 46,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  features: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    gap: 10,
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  featureDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textMuted,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 14,
  },
  primaryBtn: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  btnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  secondaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
  },
  secondaryBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  secondaryBtnBold: {
    color: Colors.purpleLight,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
