import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator, Switch, Image, type TextInput as TextInputType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, Compass, Heart, LogOut, Save, Shield, Calendar, Check, MapPin, Clock, Sparkles, Bell, MoonStar, Sun as SunIcon, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, uploadFile } from '@/lib/supabase';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { getBirthDateError } from '@/lib/validation';
import AppBackground from '@/components/AppBackground';
import { NOTIFICATION_TIME_PRESETS, requestNotificationPermission } from '@/services/notifications';
import { useThemedStyles, useTheme } from '@/providers/ThemeProvider';

export default function ProfileScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { profile, user, signOut, refreshProfile, isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [selectedSign, setSelectedSign] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ birth?: string; time?: string }>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notifEnabled, setNotifEnabled] = useState<boolean>(false);
  const [notifHour, setNotifHour] = useState<number>(8);
  const [notifMinute, setNotifMinute] = useState<number>(0);
  const [notifMessage, setNotifMessage] = useState<string | null>(null);
  const notifMessageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const nameRef = useRef<TextInputType>(null);
  const birthRef = useRef<TextInputType>(null);
  const timeRef = useRef<TextInputType>(null);
  const cityRef = useRef<TextInputType>(null);
  const saveMessageTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (saveMessageTimer.current) clearTimeout(saveMessageTimer.current);
    };
  }, []);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBirthDate(profile.birth_date ?? '');
      setSelectedSign(profile.zodiac_sign ?? '');
      setBirthCity(profile.birth_city ?? '');
      // Reconstruct birth time from quiz_data if available
      const qd = profile.quiz_data;
      if (qd?.birth_hour != null && qd?.birth_minute != null) {
        setBirthTime(`${String(qd.birth_hour).padStart(2, '0')}:${String(qd.birth_minute).padStart(2, '0')}`);
      }
      setNotifEnabled(profile.notifications_enabled);
      setNotifHour(profile.notification_hour);
      setNotifMinute(profile.notification_minute);
    }
  }, [profile]);

  useEffect(() => {
    return () => {
      if (notifMessageTimer.current) clearTimeout(notifMessageTimer.current);
    };
  }, []);

  const zodiac = selectedSign ? getZodiacByName(selectedSign) : null;

  const completeness = useMemo(() => {
    let filled = 0;
    const total = 5;
    if (displayName.trim()) filled++;
    if (birthDate.trim()) filled++;
    if (birthTime.trim()) filled++;
    if (birthCity.trim()) filled++;
    if (selectedSign) filled++;
    return { filled, total, percent: Math.round((filled / total) * 100) };
  }, [displayName, birthDate, birthTime, birthCity, selectedSign]);

  const validateProfile = (): boolean => {
    const errors: { birth?: string; time?: string } = {};
    if (birthDate.trim()) {
      const err = getBirthDateError(birthDate);
      if (err) errors.birth = err;
    }
    if (birthTime.trim()) {
      const tm = birthTime.trim().match(/^(\d{1,2}):(\d{2})$/);
      if (!tm) {
        errors.time = 'Please use HH:MM format';
      } else if (parseInt(tm[1], 10) > 23 || parseInt(tm[2], 10) > 59) {
        errors.time = 'Invalid time (hours 0-23, minutes 0-59)';
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      setSaveMessage(null);
      if (!user?.email) throw new Error('Not authenticated');
      if (!validateProfile()) throw new Error('__validation__');

      // Parse birth time (HH:MM) for quiz_data
      const timeParts = birthTime.trim().match(/^(\d{1,2}):(\d{2})$/);
      const birthHour = timeParts ? parseInt(timeParts[1], 10) : undefined;
      const birthMinute = timeParts ? parseInt(timeParts[2], 10) : undefined;

      // Merge new values into existing quiz_data (preserve web quiz fields)
      const existingQuiz = profile?.quiz_data ?? {};
      const updatedQuiz = {
        ...existingQuiz,
        ...(birthCity.trim() ? { birth_place: birthCity.trim() } : {}),
        ...(birthHour != null ? { birth_hour: birthHour } : {}),
        ...(birthMinute != null ? { birth_minute: birthMinute } : {}),
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          date_of_birth: birthDate.trim() || null,
          zodiac_sign: selectedSign || null,
          birth_city: birthCity.trim() || null,
          quiz_data: Object.keys(updatedQuiz).length > 0 ? updatedQuiz : null,
        })
        .eq('email', user.email);
      if (error) throw error;
    },
    onSuccess: () => {
      void refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      saveMessageTimer.current = setTimeout(() => setSaveMessage(null), 3000);
    },
    onError: (error: Error) => {
      if (error.message === '__validation__') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setSaveMessage({ type: 'error', text: error.message });
    },
  });

  // Separate from updateMutation on purpose: a notification preference should take
  // effect the moment it's tapped, not sit unsaved until the customer notices the big
  // "Update my cosmic profile" button further down the form.
  const notificationMutation = useMutation({
    mutationFn: async (next: { enabled: boolean; hour: number; minute: number }) => {
      if (!user?.email) throw new Error('Not authenticated');

      if (next.enabled) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          throw new Error('Notifications are turned off for AstroLyfe in your device settings.');
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          notifications_enabled: next.enabled,
          notification_hour: next.hour,
          notification_minute: next.minute,
        })
        .eq('email', user.email);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      // AuthProvider's own effect schedules or cancels the OS reminder once the
      // refreshed profile carries these values — not duplicated here.
      void refreshProfile();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setNotifMessage(next.enabled ? `Daily reminder set for ${NOTIFICATION_TIME_PRESETS.find((p) => p.hour === next.hour && p.minute === next.minute)?.label ?? 'your chosen time'}.` : null);
      if (notifMessageTimer.current) clearTimeout(notifMessageTimer.current);
      if (next.enabled) {
        notifMessageTimer.current = setTimeout(() => setNotifMessage(null), 3000);
      }
    },
    onError: (error: Error, next) => {
      // Revert the switch rather than leave it showing a state the device rejected.
      setNotifEnabled(!next.enabled);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setNotifMessage(error.message);
      notifMessageTimer.current = setTimeout(() => setNotifMessage(null), 4000);
    },
  });

  const pickAvatar = useCallback(async () => {
    if (!profile?.id || avatarUploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo library access in Settings to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setAvatarPreview(asset.uri);
    setAvatarUploading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await uploadFile('profiles', profile.id, 'avatar', {
        uri: asset.uri,
        name: asset.fileName || `avatar-${profile.id}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      await refreshProfile();
    } catch {
      setAvatarPreview(null);
      Alert.alert("Couldn't update photo", 'Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  }, [profile?.id, avatarUploading, refreshProfile]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>YOUR ASTROLYFE</Text>
          <Text style={styles.title}>Cosmic profile</Text>

          {/* Avatar Section */}
          <LinearGradient
            colors={[Colors.deepViolet, 'rgba(59,33,113,0.72)', Colors.bgCardSolid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarSection}
          >
            <View style={styles.profileSignalRow}>
              <View style={styles.profileSignalLabel}>
                <Sparkles size={13} color={Colors.lavenderIce} />
                <Text style={styles.profileSignalText}>PROFILE SIGNAL</Text>
              </View>
              <Text style={styles.profilePercent}>{completeness.percent}%</Text>
            </View>
            <Pressable
              onPress={pickAvatar}
              disabled={avatarUploading}
              accessibilityRole="button"
              accessibilityLabel={avatarPreview ?? profile?.avatar_url ? 'Change profile picture' : 'Add a profile picture'}
            >
              <View style={styles.avatarOuter}>
                <LinearGradient
                  colors={zodiac ? [zodiac.color, Colors.purple] : [Colors.purple, Colors.indigoLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}
                >
                  <View style={styles.avatarInner}>
                    {avatarPreview ?? profile?.avatar_url ? (
                      <Image source={{ uri: (avatarPreview ?? profile?.avatar_url) as string }} style={styles.avatarPhoto} />
                    ) : (
                      <Text style={styles.avatarText}>{zodiac?.symbol ?? (displayName[0] ?? '?')}</Text>
                    )}
                  </View>
                </LinearGradient>
                <View style={styles.avatarEditBadge}>
                  {avatarUploading ? (
                    <ActivityIndicator size="small" color={Colors.paperInk} />
                  ) : (
                    <Camera size={13} color={Colors.paperInk} />
                  )}
                </View>
              </View>
            </Pressable>
            <Text style={styles.displayNameHeader}>{displayName || 'Stargazer'}</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
            <View style={styles.badgeRow}>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Shield size={12} color={Colors.gold} />
                  <Text style={styles.adminText}>Admin</Text>
                </View>
              )}
              {zodiac && (
                <View style={[styles.signBadge, { backgroundColor: `${zodiac.color}15` }]}>
                  <Text style={styles.signBadgeSymbol}>{zodiac.symbol}</Text>
                  <Text style={[styles.signBadgeText, { color: zodiac.color }]}>{zodiac.name}</Text>
                </View>
              )}
            </View>
            {/* Completeness indicator */}
            <View style={styles.completenessRow}>
              <View style={styles.completenessBar}>
                <View style={[styles.completenessFill, { width: `${completeness.percent}%` as unknown as number }]}>
                  <LinearGradient colors={[Colors.purple, Colors.indigoLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFillObject} />
                </View>
              </View>
              <Text style={styles.completenessText}>reading accuracy</Text>
            </View>
          </LinearGradient>

          <View style={styles.profileActions}>
            <Pressable style={({ pressed }) => [styles.profileAction, pressed && styles.profileActionPressed]} onPress={() => router.push('/(app)/chart')} accessibilityRole="button" accessibilityLabel="Open your birth chart">
              <View style={styles.profileActionIcon}>
                <Compass size={18} color={Colors.lavenderIce} />
              </View>
              <View style={styles.profileActionCopy}>
                <Text style={styles.profileActionTitle}>Birth chart</Text>
                <Text style={styles.profileActionText}>View your blueprint</Text>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
            <Pressable style={({ pressed }) => [styles.profileAction, pressed && styles.profileActionPressed]} onPress={() => router.push('/(app)/compatibility')} accessibilityRole="button" accessibilityLabel="Open compatibility">
              <View style={[styles.profileActionIcon, styles.profileActionIconAccent]}>
                <Heart size={18} color={Colors.accentLight} />
              </View>
              <View style={styles.profileActionCopy}>
                <Text style={styles.profileActionTitle}>Compatibility</Text>
                <Text style={styles.profileActionText}>Explore a connection</Text>
              </View>
              <ChevronRight size={16} color={Colors.textMuted} />
            </Pressable>
          </View>

          {/* Form */}
          <GlassCard style={styles.formCard}>
            <Text style={styles.sectionLabel}>BIRTH PROFILE</Text>
            <Text style={styles.sectionDescription}>Precise details unlock more accurate houses, timing, and personal guidance.</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <View style={[styles.inputWrap, focusedField === 'name' && styles.inputWrapFocused]}>
              <TextInput
                ref={nameRef}
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                onSubmitEditing={() => birthRef.current?.focus()}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                accessibilityLabel="Name"
              />
            </View>

            <Text style={styles.fieldLabel}>Birth Date</Text>
            <View style={[styles.inputWrap, focusedField === 'birth' && styles.inputWrapFocused, !!fieldErrors.birth && styles.inputWrapError]}>
              <Calendar size={16} color={fieldErrors.birth ? Colors.danger : focusedField === 'birth' ? Colors.purpleLight : Colors.textMuted} />
              <TextInput
                ref={birthRef}
                style={styles.input}
                value={birthDate}
                onChangeText={(t) => { setBirthDate(t); if (fieldErrors.birth) setFieldErrors((p) => ({ ...p, birth: undefined })); }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
                autoComplete="birthdate-full"
                returnKeyType="next"
                onSubmitEditing={() => timeRef.current?.focus()}
                onFocus={() => setFocusedField('birth')}
                onBlur={() => setFocusedField(null)}
                accessibilityLabel="Birth date"
              />
            </View>
            {fieldErrors.birth && <Text style={styles.fieldError}>{fieldErrors.birth}</Text>}

            <Text style={styles.fieldLabel}>Birth Time</Text>
            <View style={[styles.inputWrap, focusedField === 'time' && styles.inputWrapFocused, !!fieldErrors.time && styles.inputWrapError]}>
              <Clock size={16} color={fieldErrors.time ? Colors.danger : focusedField === 'time' ? Colors.purpleLight : Colors.textMuted} />
              <TextInput
                ref={timeRef}
                style={styles.input}
                value={birthTime}
                onChangeText={(t) => { setBirthTime(t); if (fieldErrors.time) setFieldErrors((p) => ({ ...p, time: undefined })); }}
                placeholder="HH:MM (24hr, e.g. 14:30)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
                onFocus={() => setFocusedField('time')}
                onBlur={() => setFocusedField(null)}
                accessibilityLabel="Birth time"
              />
            </View>
            {fieldErrors.time && <Text style={styles.fieldError}>{fieldErrors.time}</Text>}

            <Text style={styles.fieldLabel}>Birth City</Text>
            <View style={[styles.inputWrap, focusedField === 'city' && styles.inputWrapFocused]}>
              <MapPin size={16} color={focusedField === 'city' ? Colors.purpleLight : Colors.textMuted} />
              <TextInput
                ref={cityRef}
                style={styles.input}
                value={birthCity}
                onChangeText={setBirthCity}
                placeholder="City, State/Country"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                onFocus={() => setFocusedField('city')}
                onBlur={() => setFocusedField(null)}
                accessibilityLabel="Birth city"
              />
            </View>

            <Text style={styles.fieldLabel}>Zodiac Sign</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.signScroll} contentContainerStyle={styles.signScrollContent}>
              {ZODIAC_SIGNS.map((sign) => {
                const isSelected = selectedSign === sign.name;
                return (
                  <Pressable
                    key={sign.name}
                    style={({ pressed }) => [styles.signChip, isSelected && { backgroundColor: `${sign.color}15`, borderColor: sign.color }, pressed && styles.signChipPressed]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setSelectedSign(sign.name);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={`${sign.name} zodiac sign`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.signChipSymbol, isSelected && { fontSize: 18 }]}>{sign.symbol}</Text>
                    <Text style={[styles.signChipLabel, isSelected && { color: sign.color }]}>{sign.name}</Text>
                    {isSelected && (
                      <View style={[styles.checkDot, { backgroundColor: sign.color }]}>
                        <Check size={8} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </GlassCard>

          {/* Appearance */}
          <GlassCard style={styles.formCard}>
            <Text style={styles.sectionLabel}>APPEARANCE</Text>
            <Text style={styles.sectionDescription}>Dark is the default. Light keeps the same purple accents on a bright background.</Text>
            <View style={styles.appearanceRow}>
              {(['dark', 'light'] as const).map((option) => {
                const isSelected = theme === option;
                return (
                  <Pressable
                    key={option}
                    style={({ pressed }) => [styles.appearanceChip, isSelected && styles.appearanceChipActive, pressed && styles.signChipPressed]}
                    onPress={() => {
                      if (isSelected) return;
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setTheme(option);
                    }}
                    accessibilityRole="radio"
                    accessibilityLabel={`${option === 'dark' ? 'Dark' : 'Light'} appearance`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    {option === 'dark' ? (
                      <MoonStar size={16} color={isSelected ? Colors.purpleLight : Colors.textMuted} />
                    ) : (
                      <SunIcon size={16} color={isSelected ? Colors.purpleLight : Colors.textMuted} />
                    )}
                    <Text style={[styles.signChipLabel, isSelected && { color: Colors.purpleLight }]}>{option === 'dark' ? 'Dark' : 'Light'}</Text>
                    {isSelected && (
                      <View style={[styles.checkDot, { backgroundColor: Colors.purple }]}>
                        <Check size={8} color="#fff" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          {/* Notifications */}
          <GlassCard style={styles.formCard}>
            <View style={styles.notifHeaderRow}>
              <View style={styles.notifHeaderCopy}>
                <Text style={styles.sectionLabel}>DAILY NOTIFICATIONS</Text>
                <Text style={styles.sectionDescription}>A gentle reminder to check your horoscope, once a day.</Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setNotifEnabled(value);
                  notificationMutation.mutate({ enabled: value, hour: notifHour, minute: notifMinute });
                }}
                trackColor={{ false: Colors.bgInputBorder, true: Colors.purple }}
                thumbColor="#fff"
                disabled={notificationMutation.isPending}
                accessibilityLabel="Daily notifications"
                accessibilityRole="switch"
              />
            </View>

            {notifEnabled && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.signScroll} contentContainerStyle={styles.signScrollContent}>
                {NOTIFICATION_TIME_PRESETS.map((preset) => {
                  const isSelected = notifHour === preset.hour && notifMinute === preset.minute;
                  return (
                    <Pressable
                      key={preset.label}
                      style={({ pressed }) => [styles.signChip, isSelected && { backgroundColor: Colors.purpleDim, borderColor: Colors.purple }, pressed && styles.signChipPressed]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setNotifHour(preset.hour);
                        setNotifMinute(preset.minute);
                        notificationMutation.mutate({ enabled: true, hour: preset.hour, minute: preset.minute });
                      }}
                      disabled={notificationMutation.isPending}
                      accessibilityRole="radio"
                      accessibilityLabel={`Send at ${preset.label}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Bell size={13} color={isSelected ? Colors.purpleLight : Colors.textMuted} />
                      <Text style={[styles.signChipLabel, isSelected && { color: Colors.purpleLight }]}>{preset.label}</Text>
                      {isSelected && (
                        <View style={[styles.checkDot, { backgroundColor: Colors.purple }]}>
                          <Check size={8} color="#fff" />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}

            {notifMessage && (
              <Text style={[styles.notifMessage, notificationMutation.isError && { color: Colors.danger }]}>{notifMessage}</Text>
            )}
          </GlassCard>

          {saveMessage && (
            <View style={[styles.saveMessageRow, saveMessage.type === 'success' ? styles.saveMessageSuccess : styles.saveMessageError]} accessibilityLiveRegion="polite">
              <Text style={[styles.saveMessageText, { color: saveMessage.type === 'success' ? Colors.success : Colors.danger }]}>{saveMessage.text}</Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              updateMutation.mutate();
            }}
            disabled={updateMutation.isPending}
            accessibilityRole="button"
            accessibilityLabel="Update my cosmic profile"
            accessibilityState={{ disabled: updateMutation.isPending, busy: updateMutation.isPending }}
          >
            <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnInner}>
              {updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Save size={17} color="#fff" />
                  <Text style={styles.saveBtnText}>Update my cosmic profile</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]} onPress={handleSignOut} accessibilityRole="button" accessibilityLabel="Sign out of AstroLyfe">
            <LogOut size={17} color={Colors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  eyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginTop: 8, marginBottom: 7 },
  title: { fontSize: 36, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20, letterSpacing: -1 },

  avatarSection: { alignItems: 'center', marginBottom: 12, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(192,154,235,0.24)', padding: 20, overflow: 'hidden' },
  profileSignalRow: { width: '100%' as unknown as number, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  profileSignalLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  profileSignalText: { color: Colors.purpleLight, fontSize: 9, fontWeight: '900', letterSpacing: 1.35 },
  profilePercent: { color: Colors.textPrimary, fontSize: 18, fontWeight: '900' },
  avatarOuter: { marginBottom: 14 },
  avatarGradient: {
    width: 92,
    height: 92,
    borderRadius: 46,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 44,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, color: Colors.purpleLight },
  avatarPhoto: { width: '100%' as unknown as number, height: '100%' as unknown as number, borderRadius: 44 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bgCardSolid,
  },
  displayNameHeader: { fontSize: 26, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.55, textAlign: 'center' },
  email: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.goldDim, borderRadius: 12 },
  adminText: { fontSize: 11, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  signBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  signBadgeSymbol: { fontSize: 14 },
  signBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  profileActions: { gap: 10, marginBottom: 22 },
  profileAction: { minHeight: 70, borderRadius: 18, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: 'rgba(218,200,242,0.035)', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileActionPressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  profileActionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(97,56,163,0.24)', alignItems: 'center', justifyContent: 'center' },
  profileActionIconAccent: { backgroundColor: Colors.accentDim },
  profileActionCopy: { flex: 1 },
  profileActionTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  profileActionText: { color: Colors.textMuted, fontSize: 11, marginTop: 3 },
  formCard: { marginBottom: 20, gap: 4, borderRadius: 22 },
  appearanceRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  appearanceChip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: 14, backgroundColor: Colors.bgInput,
    borderWidth: 1, borderColor: Colors.bgInputBorder,
  },
  appearanceChipActive: { backgroundColor: Colors.purpleDim, borderColor: Colors.purple },
  notifHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  notifHeaderCopy: { flex: 1 },
  notifMessage: { color: Colors.purpleLight, fontSize: 12, marginTop: 12, lineHeight: 17 },
  sectionLabel: { fontSize: 11, fontWeight: '900', color: Colors.purpleLight, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 5 },
  sectionDescription: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 16,
    height: 54,
    gap: 12,
  },
  inputWrapFocused: { borderColor: Colors.purpleGlow, backgroundColor: Colors.bgInputFocused },
  inputWrapError: { borderColor: Colors.danger },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  fieldError: { fontSize: 12, color: Colors.danger, marginLeft: 16, marginTop: 2 },

  signScroll: { marginTop: 4, marginHorizontal: -6 },
  signScrollContent: { gap: 8, paddingVertical: 4, paddingHorizontal: 6 },
  signChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
  },
  signChipPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  signChipSymbol: { fontSize: 15 },
  signChipLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  checkDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },

  completenessRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, width: '88%' as unknown as number },
  completenessBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  completenessFill: { height: '100%' as unknown as number, borderRadius: 3, overflow: 'hidden' },
  completenessText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  saveMessageRow: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  saveMessageSuccess: { backgroundColor: Colors.successDim },
  saveMessageError: { backgroundColor: Colors.dangerDim },
  saveMessageText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  saveBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 14, shadowColor: Colors.purple, shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: Colors.dangerDim,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.15)',
  },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
});
