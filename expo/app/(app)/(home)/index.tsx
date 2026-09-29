import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { requestNotificationPermission } from '@/services/notifications';
import { supabase } from '@/lib/supabase';
import { NOTIF_PROMPT_FLAG } from '@/constants/storageKeys';
import NotificationPromptModal from '@/components/NotificationPromptModal';
import PowerPlaces from '@/components/PowerPlaces';

/**
 * The landing tab. It shows Power Places — the thing only this app does — rather than
 * a daily horoscope, which is available one tab over under Forecast.
 *
 * This route stays the landing target (sign-in, onboarding and the welcome tour all
 * replace to /(app)/(home)), and it keeps the one-time notification prompt the
 * welcome tour hands off to via NOTIF_PROMPT_FLAG.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(NOTIF_PROMPT_FLAG).then((flag) => {
      if (cancelled || !flag) return;
      // Consume immediately so this can never show again, regardless of what the
      // customer does next (background the app, force-quit before answering, etc).
      void AsyncStorage.removeItem(NOTIF_PROMPT_FLAG);
      setShowNotifPrompt(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    setShowNotifPrompt(false);
    const granted = await requestNotificationPermission();
    if (granted && profile?.email) {
      try {
        await supabase.from('profiles').update({ notifications_enabled: true }).eq('email', profile.email);
        await refreshProfile();
      } catch {
        // The OS permission is granted either way; a failed write here just means the
        // Profile tab's toggle won't be pre-checked, which the customer can flip
        // themselves on the screen they're about to land on.
      }
    }
    router.push('/(app)/profile');
  }, [profile?.email, refreshProfile, router]);

  const handleDismissNotifPrompt = useCallback(() => {
    setShowNotifPrompt(false);
  }, []);

  return (
    <View style={styles.container}>
      <PowerPlaces />
      <NotificationPromptModal
        visible={showNotifPrompt}
        onEnable={handleEnableNotifications}
        onDismiss={handleDismissNotifPrompt}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
});
