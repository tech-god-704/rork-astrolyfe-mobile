import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Sun, Heart, BookOpen, MessageCircle, Compass, User } from 'lucide-react-native';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Colors from '@/constants/colors';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import { useAuth } from '@/providers/AuthProvider';

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,28,0.75)' }]} />
      <View style={tabStyles.topBorder} />
    </View>
  );
}

function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.purpleLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
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

export default function AppTabLayout() {
  const { isSubscribed } = useAuth();

  // Subscribers and admins see the full app
  if (isSubscribed) {
    return <AppTabs />;
  }

  // Non-subscribers see the paywall
  return <SubscriptionGuard><AppTabs /></SubscriptionGuard>;
}

const tabStyles = StyleSheet.create({
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(167,139,250,0.08)',
  },
});
