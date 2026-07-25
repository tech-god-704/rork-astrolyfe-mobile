import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Sun, Heart, BookOpen, MessageCircle, Compass, User } from 'lucide-react-native';
import { Platform, View, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import { useAuth } from '@/providers/AuthProvider';

function TabBarBackground() {
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, tabStyles.background]} />
      <View style={tabStyles.topBorder} />
    </View>
  );
}

function TabIcon({ Icon, color, focused }: { Icon: typeof Home; color: string; focused: boolean }) {
  return (
    <View style={[tabStyles.iconWrap, focused && tabStyles.iconWrapActive]}>
      <Icon size={20} color={color} strokeWidth={focused ? 2 : 1.7} />
      {focused && <View style={tabStyles.bearing} />}
    </View>
  );
}

function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.lavenderIce,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          height: Platform.OS === 'ios' ? 84 : 68,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          paddingTop: 7,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.35,
          marginTop: 1,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Home} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="horoscope"
        options={{
          title: 'Forecast',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Sun} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Ask',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={MessageCircle} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="compatibility"
        options={{
          title: 'Match',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Heart} color={color} focused={focused} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={BookOpen} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chart"
        options={{
          title: 'Chart',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Compass} color={color} focused={focused} />,
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={User} color={color} focused={focused} />,
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
  background: {
    backgroundColor: 'rgba(2,1,6,0.98)',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(218,200,242,0.15)',
  },
  iconWrap: {
    width: 38,
    height: 27,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: 'rgba(97,56,163,0.24)',
  },
  bearing: {
    position: 'absolute',
    top: -8,
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.gold,
  },
});
