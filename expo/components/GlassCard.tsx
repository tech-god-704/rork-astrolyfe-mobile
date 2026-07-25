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
      <View style={[styles.topRule, isSubtle && styles.topRuleSubtle]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
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
    backgroundColor: Colors.bgCardSolid,
    borderColor: 'rgba(241,236,226,0.16)',
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
    backgroundColor: 'rgba(241,236,226,0.028)',
    borderColor: 'rgba(241,236,226,0.08)',
    padding: 16,
  },
  topRule: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(241,236,226,0.16)',
  },
  topRuleSubtle: {
    backgroundColor: 'rgba(241,236,226,0.08)',
  },
});
