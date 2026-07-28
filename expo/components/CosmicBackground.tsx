import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';

export default function CosmicBackground({ children }: { children?: React.ReactNode }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <AppBackground />
      {children}
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
