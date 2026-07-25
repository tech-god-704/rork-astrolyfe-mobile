import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}

export default function SectionHeader({ title, subtitle, action, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {action && onAction && (
        <Pressable onPress={onAction} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
          <Text style={styles.actionText}>{action}</Text>
          <ChevronRight size={14} color={Colors.purpleLight} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  left: { flex: 1 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.purpleLight,
  },
});
