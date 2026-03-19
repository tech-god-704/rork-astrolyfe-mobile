import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const STAR_COUNT = Platform.OS === 'web' ? 15 : 30;

interface StarData {
  x: number;
  y: number;
  size: number;
  initialOpacity: number;
}

export default function CosmicBackground({ children }: { children?: React.ReactNode }) {
  const starData = useMemo<StarData[]>(() => {
    return Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * SCREEN_W,
      y: Math.random() * SCREEN_H,
      size: Math.random() * 2.5 + 0.5,
      initialOpacity: Math.random() * 0.5 + 0.2,
    }));
  }, []);

  const opacityRefs = useRef<Animated.Value[]>(
    starData.map((s) => new Animated.Value(s.initialOpacity))
  ).current;

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [];
    opacityRefs.forEach((opacity, i) => {
      const twinkle = () => {
        const anim = Animated.sequence([
          Animated.timing(opacity, {
            toValue: Math.random() * 0.6 + 0.1,
            duration: 2000 + Math.random() * 2000,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(opacity, {
            toValue: Math.random() * 0.3 + 0.05,
            duration: 2000 + Math.random() * 2000,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]);
        animations.push(anim);
        anim.start(() => twinkle());
      };
      const timer = setTimeout(twinkle, starData[i].initialOpacity * 3000);
      animations.push({ stop: () => clearTimeout(timer) } as Animated.CompositeAnimation);
    });

    return () => {
      animations.forEach((a) => a.stop());
    };
  }, [opacityRefs, starData]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
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
              opacity: opacityRefs[i],
            },
          ]}
        />
      ))}
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
    position: 'absolute' as const,
    backgroundColor: '#fff',
  },
});
