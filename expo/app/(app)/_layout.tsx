import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Sun, Heart, BookOpen, MessageCircle, Compass, User } from 'lucide-react-native';
import { Platform, View, StyleSheet } from 'react-native';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import Colors from '@/constants/colors';
import SubscriptionGuard from '@/components/SubscriptionGuard';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme, useThemedStyles } from '@/providers/ThemeProvider';

function TabBarBackground() {
  const tabStyles = useThemedStyles(createTabStyles);
  return (
    <View style={StyleSheet.absoluteFill}>
      <View style={[StyleSheet.absoluteFill, tabStyles.background]} />
      <View style={tabStyles.topBorder} />
    </View>
  );
}

function TabIcon({ Icon, color, focused }: { Icon: typeof Home; color: string; focused: boolean }) {
  const tabStyles = useThemedStyles(createTabStyles);
  return (
    <View style={tabStyles.iconWrap}>
      {focused && <View style={tabStyles.activeGlow} />}
      <Icon size={20} color={color} strokeWidth={focused ? 2 : 1.7} />
      {focused && <View style={tabStyles.bearing} />}
    </View>
  );
}

function TabButton({ style, ...props }: BottomTabBarButtonProps) {
  const tabStyles = useThemedStyles(createTabStyles);
  return <PlatformPressable {...props} style={[style, tabStyles.tabButton]} />;
}

function AppTabs() {
  // Subscribes to theme so screenOptions below (which read Colors.tabBarActive /
  // Colors.tabBarInactive) recompute on a theme change — this component doesn't
  // otherwise re-render when the preference flips.
  useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.tabBarActive,
        tabBarInactiveTintColor: Colors.tabBarInactive,
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => <TabButton {...props} />,
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
          // Hidden for launch: the astrologer replies are seeded personas with nothing
          // that generates a reply — see the game plan discussed for building that out
          // properly. Not deleted, same href: null pattern already used for
          // compatibility/chart above, kept routable rather than removed.
          href: null,
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

const createTabStyles = () => StyleSheet.create({
  background: {
    backgroundColor: Colors.tabBarBg,
    shadowColor: Colors.purple,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
  },
  tabButton: {
    outlineWidth: 0,
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.tabBarBorder,
  },
  iconWrap: {
    width: 38,
    height: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeGlow: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(150,98,198,0.32)',
    shadowColor: Colors.nebulaMagenta,
    shadowOpacity: 0.72,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  bearing: {
    position: 'absolute',
    bottom: -4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.tabBarActive,
    shadowColor: Colors.lavender,
    shadowOpacity: 0.95,
    shadowRadius: 7,
  },
});
