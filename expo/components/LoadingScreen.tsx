import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import AppBackground from '@/components/AppBackground';
import BrandMark from '@/components/BrandMark';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';

export default function LoadingScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 10, tension: 55, useNativeDriver: true }),
      Animated.timing(rotation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, rotation, scale]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['-18deg', '0deg'] });

  return (
    <View style={styles.container}>
      <AppBackground />
      <Animated.View style={[styles.content, { opacity, transform: [{ scale }, { rotate }] }]}>
        <BrandMark size={108} />
        <Text style={styles.wordmark}>AstroLyfe</Text>
        <Text style={styles.status}>Aligning your universe</Text>
      </Animated.View>
      <Text style={styles.meta}>PERSONAL · PRIVATE · COSMIC</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
  status: {
    color: Colors.textMuted,
    fontSize: 13,
    letterSpacing: 0.5,
    marginTop: 10,
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
