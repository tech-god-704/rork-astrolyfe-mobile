import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import AppBackground from '@/components/AppBackground';
import BrandMark from '@/components/BrandMark';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useThemedStyles } from '@/providers/ThemeProvider';

export default function LoadingScreen() {
  const styles = useThemedStyles(createStyles);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 10, tension: 55, useNativeDriver: true }),
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 760, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.45, duration: 760, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    entrance.start();
    breathing.start();
    return () => {
      entrance.stop();
      breathing.stop();
    };
  }, [opacity, pulse, rotation, scale]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] });

  return (
    <View style={styles.container}>
      <AppBackground />
      <Animated.View
        style={[styles.content, { opacity, transform: [{ scale }, { rotate }] }]}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading AstroLyfe"
      >
        <BrandMark size={108} />
        <Text style={styles.wordmark}>AstroLyfe</Text>
        <View style={styles.statusRow}>
          <Animated.View style={[styles.statusDot, { opacity: pulse, transform: [{ scale: pulse }] }]} />
          <Text style={styles.status}>Aligning your universe</Text>
        </View>
      </Animated.View>
      <Text style={styles.meta}>PERSONAL · PRIVATE · COSMIC</Text>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  wordmark: {
    color: Colors.textPrimary,
    fontFamily: Fonts.display,
    fontSize: 36,
    marginTop: 24,
    letterSpacing: -0.8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  status: {
    color: Colors.textMuted,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  meta: {
    position: 'absolute',
    bottom: 44,
    color: Colors.textFaint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
