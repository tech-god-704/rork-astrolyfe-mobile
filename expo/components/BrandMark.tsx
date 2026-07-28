import React from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import Colors from '@/constants/colors';
import { useThemedStyles } from '@/providers/ThemeProvider';

export default function BrandMark({ size = 96 }: { size?: number; light?: boolean }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: 'rgba(192,154,235,0.54)',
        },
      ]}
    >
      <Image source={require('../assets/images/icon.png')} style={styles.image} resizeMode="cover" />
      <View style={styles.innerRing} />
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  root: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: Colors.accent,
        shadowOpacity: 0.3,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
    }),
  },
  image: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.16 }],
  },
  innerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(237,228,253,0.16)',
  },
});
