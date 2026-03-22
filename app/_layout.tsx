import { QueryClient, QueryClientProvider, focusManager, onlineManager } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, AppState, AppStateStatus, Platform, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import Colors from "@/constants/colors";

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

// React Query: refetch on app focus
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    handleFocus(status === 'active');
  });
  return () => subscription.remove();
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch when user returns to app after 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache for 30 minutes
      gcTime: 30 * 60 * 1000,
      // Retry with backoff
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
      // Refetch on reconnect and focus
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function AuthGate({ onReady }: { onReady: () => void }) {
  const { isAuthenticated, isReady } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const splashHidden = useRef(false);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (isAuthenticated && inAuthGroup) {
      router.replace("/(app)/(home)");
    }

    // Hide splash AFTER navigation is set, with a small delay for the
    // destination screen to mount. This prevents the white/empty flash.
    if (!splashHidden.current) {
      splashHidden.current = true;
      setTimeout(() => {
        if (Platform.OS !== 'web') {
          SplashScreen.hideAsync().catch(() => {});
        }
        onReady();
      }, 150);
    }
  }, [isAuthenticated, isReady, segments, router, onReady]);

  return null;
}

function RootLayoutNav() {
  const { isReady } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [appReady, setAppReady] = useState(false);

  const handleReady = useCallback(() => {
    setAppReady(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Don't render navigation until auth state is determined.
  // Splash screen stays visible, so user sees nothing flash.
  if (!isReady) {
    return (
      <View style={layoutStyles.loading}>
        <ActivityIndicator color={Colors.purple} size="large" />
      </View>
    );
  }

  return (
    <View style={layoutStyles.root}>
      {/* Dark background to prevent any white flash */}
      <View style={layoutStyles.loading} />
      <Animated.View style={[layoutStyles.root, { opacity: appReady ? fadeAnim : 1 }]}>
        <AuthGate onReady={handleReady} />
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'fade',
            animationDuration: 250,
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </Animated.View>
    </View>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <RootLayoutNav />
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
