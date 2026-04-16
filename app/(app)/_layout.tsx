import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Sun, Heart, BookOpen, MessageCircle, Compass, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import Colors from '@/constants/colors';

export default function AppTabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.purpleLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,28,0.95)',
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
            },
            android: { elevation: 12 },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          title: 'Horoscope',
          tabBarIcon: ({ color, size }) => <Sun size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="compatibility"
        options={{
          title: 'Match',
          tabBarIcon: ({ color, size }) => <Heart size={size - 2} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, size }) => <BookOpen size={size - 2} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chart"
        options={{
          title: 'Chart',
          tabBarIcon: ({ color, size }) => <Compass size={size - 2} color={color} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} />,
        }}
      />
    </Tabs>
  );
}
