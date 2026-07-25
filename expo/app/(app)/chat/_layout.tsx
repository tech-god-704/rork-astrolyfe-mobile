import React from 'react';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function ChatStackLayout() {
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
