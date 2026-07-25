import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import AppBackground from '@/components/AppBackground';

export default function CosmicBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <AppBackground />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
});
