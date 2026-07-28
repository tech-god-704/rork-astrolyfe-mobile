import React from 'react';
import { View, StyleSheet, ViewStyle, Platform, StyleProp } from 'react-native';
import Colors from '@/constants/colors';
import { useThemedStyles } from '@/providers/ThemeProvider';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'glow' | 'elevated' | 'subtle';
  glowColor?: string;
}

export default function GlassCard({ children, style, variant = 'default', glowColor }: GlassCardProps) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = () => StyleSheet.create({
  card: {
    // This is the single most-used surface in the app. It previously hardcoded a
    // near-black fill directly here rather than reading it from the palette, so every
    // card everywhere would have rendered as a dark box on a light background —
    // glassCard/glassCardElevated exist in constants/colors.ts specifically to fix that.
    backgroundColor: Colors.glassCard,
    borderRadius: 20,
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
    backgroundColor: Colors.glassCardElevated,
    borderColor: Colors.bgCardBorder,
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
    backgroundColor: Colors.bgCard,
    borderColor: Colors.bgCardBorder,
    padding: 16,
  },
});
