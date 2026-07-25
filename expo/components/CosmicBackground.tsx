import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STAR_COUNT = Platform.OS === 'web' ? 20 : 50;
const SHOOTING_STAR_COUNT = Platform.OS === 'web' ? 1 : 3;

interface StarData {
  x: number;
  y: number;
  size: number;
  initialOpacity: number;
  color: string;
}

interface ShootingStarData {
  startX: number;
  startY: number;
  length: number;
  angle: number;
  delay: number;
}

const STAR_COLORS = [
  '#fff',
  '#E0D4FF',
  '#C4B5FD',
  '#A5B4FC',
  '#FDE68A',
];

export default function CosmicBackground({ children }: { children?: React.ReactNode }) {
  const starData = useMemo<StarData[]>(() => {
    return Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * SCREEN_W,
      y: Math.random() * SCREEN_H,
      size: Math.random() * 2.5 + 0.5,
      initialOpacity: Math.random() * 0.5 + 0.2,
      color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
    }));
  }, []);

  const shootingStars = useMemo<ShootingStarData[]>(() => {
    return Array.from({ length: SHOOTING_STAR_COUNT }, (_, i) => ({
      startX: Math.random() * SCREEN_W * 0.8,
      startY: Math.random() * SCREEN_H * 0.4,
      length: 80 + Math.random() * 60,
      angle: 25 + Math.random() * 20,
      delay: i * 8000 + Math.random() * 6000,
    }));
  }, []);

  const opacityRefs = useRef<Animated.Value[]>(
    starData.map((s) => new Animated.Value(s.initialOpacity))
  ).current;

  const shootingOpacities = useRef<Animated.Value[]>(
    shootingStars.map(() => new Animated.Value(0))
  ).current;

  const shootingTranslations = useRef<Animated.Value[]>(
    shootingStars.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];
    opacityRefs.forEach((opacity, i) => {
      const twinkle = () => {
        const anim = Animated.sequence([
          Animated.timing(opacity, {
            toValue: Math.random() * 0.7 + 0.15,
            duration: 1500 + Math.random() * 2500,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: Math.random() * 0.2 + 0.05,
            duration: 1500 + Math.random() * 2500,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]);
        animations.push(anim);
        anim.start(() => twinkle());
      };
      const timer = setTimeout(twinkle, starData[i].initialOpacity * 3000);
      animations.push({ stop: () => clearTimeout(timer) } as Animated.CompositeAnimation);
    });

    // Shooting star animations
    shootingStars.forEach((star, i) => {
      const animate = () => {
        shootingOpacities[i].setValue(0);
        shootingTranslations[i].setValue(0);
        const anim = Animated.sequence([
          Animated.delay(star.delay + Math.random() * 10000),
          Animated.parallel([
            Animated.sequence([
              Animated.timing(shootingOpacities[i], {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: Platform.OS !== 'web',
              }),
              Animated.timing(shootingOpacities[i], {
                toValue: 0,
                duration: 600,
                useNativeDriver: Platform.OS !== 'web',
              }),
            ]),
            Animated.timing(shootingTranslations[i], {
              toValue: 1,
              duration: 800,
              useNativeDriver: Platform.OS !== 'web',
            }),
          ]),
        ]);
        animations.push(anim);
        anim.start(() => animate());
      };
      animate();
    });

    return () => {
      animations.forEach((a) => a.stop());
    };
  }, [opacityRefs, starData, shootingStars, shootingOpacities, shootingTranslations]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {/* Nebula glow spots */}
      <View style={[styles.nebula, { top: SCREEN_H * 0.15, left: -40, backgroundColor: 'rgba(124,58,237,0.04)' }]} />
      <View style={[styles.nebula, { top: SCREEN_H * 0.5, right: -60, backgroundColor: 'rgba(244,114,182,0.03)' }]} />
      <View style={[styles.nebula, { bottom: SCREEN_H * 0.1, left: SCREEN_W * 0.3, backgroundColor: 'rgba(99,102,241,0.03)' }]} />

      {starData.map((star, i) => (
        <Animated.View
          key={i}
          style={[
            styles.star,
            {
              left: star.x,
              top: star.y,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              backgroundColor: star.color,
              opacity: opacityRefs[i],
            },
          ]}
        />
      ))}

      {/* Shooting stars */}
      {shootingStars.map((star, i) => {
        const rad = (star.angle * Math.PI) / 180;
        const translateX = shootingTranslations[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.cos(rad) * star.length],
        });
        const translateY = shootingTranslations[i].interpolate({
          inputRange: [0, 1],
          outputRange: [0, Math.sin(rad) * star.length],
        });
        return (
          <Animated.View
            key={`shoot-${i}`}
            style={[
              styles.shootingStar,
              {
                left: star.startX,
                top: star.startY,
                width: star.length * 0.4,
                opacity: shootingOpacities[i],
                transform: [
                  { translateX },
                  { translateY },
                  { rotate: `${star.angle}deg` },
                ],
              },
            ]}
          />
        );
      })}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  star: {
    position: 'absolute',
  },
  shootingStar: {
    position: 'absolute',
    height: 1.5,
    borderRadius: 1,
    backgroundColor: '#fff',
  },
  nebula: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
});
