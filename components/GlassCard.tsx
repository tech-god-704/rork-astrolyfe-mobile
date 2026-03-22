import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
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
      <LinearGradient
        colors={[
          isSubtle ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
          'rgba(255,255,255,0.02)',
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    padding: 18,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  elevated: {
    borderColor: 'rgba(255,255,255,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  subtle: {
    borderColor: 'rgba(255,255,255,0.04)',
    padding: 16,
  },
});
