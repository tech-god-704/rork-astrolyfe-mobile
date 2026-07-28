import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, AppState, AppStateStatus, Platform, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";
import { ThemeProvider, useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import Colors from "@/constants/colors";
import LoadingScreen from "@/components/LoadingScreen";
import { onboardingDoneKey } from "@/constants/storageKeys";

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
  const { isAuthenticated, isReady, profile, skipAuth } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const splashHidden = useRef(false);
  // Fallback for when welcome-tour's onboarding_completed write failed: without this,
  // a stale profile.onboarding_completed would make needsOnboarding true again the
  // instant navigation lands on Home, bouncing straight back to /welcome-tour in the
  // same session rather than "next login" as that failure path assumes. Keyed per
  // email so a second account on the same device isn't wrongly treated as done.
  const [onboardingDoneLocally, setOnboardingDoneLocally] = useState(false);

  useEffect(() => {
    if (!profile?.email) {
      setOnboardingDoneLocally(false);
      return;
    }
    let cancelled = false;
    AsyncStorage.getItem(onboardingDoneKey(profile.email))
      .then((v) => { if (!cancelled) setOnboardingDoneLocally(!!v); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [profile?.email]);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";
    const onWelcomeTour = segments[0] === "welcome-tour";

    // Right after login, session/isAuthenticated flips true a tick before the profile
    // fetch inside onAuthStateChange resolves. Gating on profileResolved rather than
    // just isAuthenticated stops that window from routing a first-time login straight
    // to home before the onboarding check has anything to check against.
    const profileResolved = profile !== null || skipAuth;
    const needsOnboarding =
      isAuthenticated && !skipAuth && profile !== null && profile.onboarding_completed !== true && !onboardingDoneLocally;

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/welcome");
    } else if (isAuthenticated && profileResolved && needsOnboarding && !onWelcomeTour) {
      router.replace("/welcome-tour");
    } else if (isAuthenticated && inAuthGroup && profileResolved && !needsOnboarding) {
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
  }, [isAuthenticated, isReady, profile, skipAuth, segments, router, onReady, onboardingDoneLocally]);

  return null;
}

function RootLayoutNav() {
  const { isReady } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(createLayoutStyles);
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
    return <LoadingScreen />;
  }

  return (
    <View style={styles.root}>
      {/* Prevents a white/black flash of the wrong theme's background while the
          navigator underneath is still mounting. */}
      <View style={styles.loading} />
      <Animated.View style={[styles.root, { opacity: appReady ? fadeAnim : 1 }]}>
        {/* Light content (white icons/text) reads on the dark theme's near-black
            status bar; dark content is needed once the status bar itself is light. */}
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
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
          <Stack.Screen name="welcome-tour" />
        </Stack>
      </Animated.View>
    </View>
  );
}

const createLayoutStyles = () => StyleSheet.create({
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
          <ThemeProvider>
            <AuthProvider>
              <RootLayoutNav />
            </AuthProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
