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
          headerStyle: { backgroundColor: '#0d0d22' },
          headerTintColor: Colors.textPrimary,
          headerTitle: 'Chat',
        }}
      />
    </Stack>
  );
}
