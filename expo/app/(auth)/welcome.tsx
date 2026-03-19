import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';

export default function WelcomeScreen() {
  const router = useRouter();
  const { setSkipAuth } = useAuth();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoScale, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(fadeIn, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(btnOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ]).start();
  }, [fadeIn, slideUp, logoScale, btnOpacity]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a103d', '#120d2e', '#0a0a1a']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topSection}>
          <Animated.View style={[styles.logoContainer, { opacity: fadeIn, transform: [{ scale: logoScale }] }]}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>✦</Text>
            </View>
          </Animated.View>
          <Animated.Text style={[styles.title, { opacity: fadeIn }]}>AstroLyfe</Animated.Text>
          <Animated.Text style={[styles.subtitle, { opacity: fadeIn }]}>
            Your cosmic journey begins here
          </Animated.Text>
        </View>

        <Animated.View style={[styles.bottomSection, { opacity: btnOpacity, transform: [{ translateY: slideUp }] }]}>
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
              <Sparkles size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Get Started</Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
            onPress={() => router.push('/(auth)/login')}
            testID="login-btn"
          >
            <Text style={styles.secondaryBtnText}>Already have an account? Log in</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.purpleDim,
    borderWidth: 2,
    borderColor: Colors.purpleGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: {
    fontSize: 44,
    color: Colors.purpleLight,
  },
  title: {
    fontSize: 42,
    fontWeight: '800' as const,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 17,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 14,
  },
  primaryBtn: {
    borderRadius: 16,
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
    fontWeight: '700' as const,
    color: '#fff',
  },
  secondaryBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  skipBtn: {
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  skipBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
});
