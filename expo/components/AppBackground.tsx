import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';

export default function AppBackground({ quiet = false }: { quiet?: boolean }) {
  // The gradient colors below are read fresh on every render (not frozen inside a
  // StyleSheet.create block), so they already pick up a theme change — this call is
  // only here to subscribe to the theme context, which is what makes this component
  // re-render in the first place when the preference changes.
  useTheme();
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
          <View style={styles.magentaGlow} />
          <View style={styles.coolGlow} />
          <View style={styles.starA} />
          <View style={styles.starB} />
          <View style={styles.starC} />
          <View style={styles.starD} />
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
    top: -155,
    right: -95,
    backgroundColor: 'rgba(97,56,163,0.24)',
  },
  magentaGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    top: 190,
    left: -180,
    backgroundColor: 'rgba(217,148,242,0.055)',
  },
  coolGlow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    bottom: -185,
    right: -145,
    backgroundColor: 'rgba(111,178,250,0.085)',
  },
  starA: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(217,148,242,0.74)',
    top: 106,
    left: 38,
  },
  starB: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(218,200,242,0.52)',
    top: 248,
    left: 86,
  },
  starC: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(127,170,189,0.55)',
    top: 356,
    right: 38,
  },
  starD: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(111,178,250,0.7)',
    top: 164,
    right: 72,
  },
});
