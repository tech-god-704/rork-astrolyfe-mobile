import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

export default function AppBackground({ quiet = false }: { quiet?: boolean }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {!quiet && (
        <>
          <View style={styles.violetGlow} />
          <View style={styles.coolGlow} />
          <View style={styles.orbitLarge} />
          <View style={styles.orbitSmall} />
          <View style={styles.meridian} />
          <View style={styles.starA} />
          <View style={styles.starB} />
          <View style={styles.starC} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  violetGlow: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    top: -180,
    right: -120,
    backgroundColor: 'rgba(97,56,163,0.20)',
  },
  coolGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: -170,
    left: -110,
    backgroundColor: 'rgba(111,178,250,0.075)',
  },
  orbitLarge: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    borderWidth: 1,
    borderColor: 'rgba(218,200,242,0.07)',
    right: -205,
    top: 54,
    transform: [{ scaleY: 0.62 }, { rotate: '-12deg' }],
  },
  orbitSmall: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.17)',
    right: -58,
    top: 116,
    transform: [{ scaleY: 0.62 }, { rotate: '-12deg' }],
  },
  meridian: {
    position: 'absolute',
    width: 1,
    height: 170,
    right: 47,
    top: 70,
    backgroundColor: 'rgba(218,200,242,0.06)',
    transform: [{ rotate: '22deg' }],
  },
  starA: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(217,148,242,0.74)',
    top: 118,
    left: 42,
  },
  starB: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(218,200,242,0.52)',
    top: 205,
    left: 112,
  },
  starC: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(127,170,189,0.55)',
    top: 318,
    right: 44,
  },
});
