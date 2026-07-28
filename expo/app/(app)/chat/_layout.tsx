import React from 'react';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';
import { useTheme } from '@/providers/ThemeProvider';

export default function ChatStackLayout() {
  // Subscribes to the theme context so this re-renders (and re-reads the Colors.xxx
  // values below, which are otherwise only evaluated once per navigator mount) when
  // the preference changes.
  useTheme();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[conversationId]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: Colors.bgElevated },
          headerTintColor: Colors.textPrimary,
          headerTitle: 'Consultation',
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
