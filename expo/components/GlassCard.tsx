import React from 'react';
import { View, StyleSheet, ViewStyle, Platform, StyleProp } from 'react-native';
import Colors from '@/constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'glow' | 'elevated' | 'subtle';
  glowColor?: string;
}

export default function GlassCard({ children, style, variant = 'default', glowColor }: GlassCardProps) {
  const isGlow = variant === 'glow';
  const isElevated = variant === 'elevated';
  const isSubtle = variant === 'subtle';

  return (
    <View
      style={[
        styles.card,
        isElevated && styles.elevated,
        isSubtle && styles.subtle,
        isGlow && {
          borderColor: glowColor ? `${glowColor}33` : Colors.purpleGlow,
          ...Platform.select({
            ios: {
              shadowColor: glowColor ?? Colors.purple,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            },
            android: { elevation: 6 },
          }),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(9,5,27,0.76)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(218,200,242,0.13)',
    padding: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: { elevation: 3 },
    }),
  },
  elevated: {
    backgroundColor: 'rgba(21,12,51,0.88)',
    borderColor: 'rgba(192,154,235,0.24)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.32,
        shadowRadius: 22,
      },
      android: { elevation: 8 },
    }),
  },
  subtle: {
    backgroundColor: 'rgba(218,200,242,0.035)',
    borderColor: 'rgba(218,200,242,0.09)',
    padding: 16,
  },
});
