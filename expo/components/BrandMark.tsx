import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Colors from '@/constants/colors';

export default function BrandMark({ size = 96, light = false }: { size?: number; light?: boolean }) {
  const color = light ? Colors.paperInk : Colors.gold;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.root, { width: size, height: size, borderRadius: size / 2, borderColor: `${color}55` }]}
    >
      <View style={[styles.orbit, { width: size * 1.12, height: size * 0.42, borderRadius: size, borderColor: `${color}88` }]} />
      <View style={[styles.meridian, { height: size * 0.82, backgroundColor: `${color}55` }]} />
      <View style={[styles.sun, { width: size * 0.25, height: size * 0.25, borderRadius: size, backgroundColor: color }]}>
        <Text style={[styles.star, { color: light ? Colors.paper : Colors.paperInk, fontSize: size * 0.13 }]}>✦</Text>
      </View>
      <View style={[styles.bearing, { top: size * 0.05, backgroundColor: color }]} />
      <View style={[styles.bearing, { bottom: size * 0.05, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  orbit: {
    position: 'absolute',
    borderWidth: 1,
    transform: [{ rotate: '-12deg' }],
  },
  meridian: {
    position: 'absolute',
    width: 1,
    transform: [{ rotate: '18deg' }],
  },
  sun: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    textAlign: 'center',
  },
  bearing: {
    position: 'absolute',
    width: 2,
    height: 6,
    borderRadius: 1,
  },
});
