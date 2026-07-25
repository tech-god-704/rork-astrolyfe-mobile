import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator, type TextInput as TextInputType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Save, Shield, Calendar, Check, MapPin, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { getBirthDateError } from '@/lib/validation';
import AppBackground from '@/components/AppBackground';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile, isAdmin } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [selectedSign, setSelectedSign] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ birth?: string; time?: string }>({});
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    }
  }, [profile]);

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
          <View style={styles.avatarSection}>
            <View style={styles.avatarOuter}>
              <LinearGradient
                colors={zodiac ? [zodiac.color, Colors.purple] : [Colors.purple, Colors.indigoLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  <Text style={styles.avatarText}>{zodiac?.symbol ?? (displayName[0] ?? '?')}</Text>
                </View>
              </LinearGradient>
            </View>
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
              <Text style={styles.completenessText}>{completeness.percent}% reading accuracy</Text>
            </View>
          </View>

          {/* Form */}
          <GlassCard style={styles.formCard}>
            <Text style={styles.sectionLabel}>BIRTH PROFILE</Text>

            <Text style={styles.fieldLabel}>Name</Text>
            <View style={[styles.inputWrap, focusedField === 'name' && styles.inputWrapFocused]}>
              <TextInput
                ref={nameRef}
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
                onSubmitEditing={() => birthRef.current?.focus()}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
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
                returnKeyType="next"
                onSubmitEditing={() => timeRef.current?.focus()}
                onFocus={() => setFocusedField('birth')}
                onBlur={() => setFocusedField(null)}
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
                returnKeyType="next"
                onSubmitEditing={() => cityRef.current?.focus()}
                onFocus={() => setFocusedField('time')}
                onBlur={() => setFocusedField(null)}
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
                returnKeyType="done"
                onFocus={() => setFocusedField('city')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Text style={styles.fieldLabel}>Zodiac Sign</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.signScroll} contentContainerStyle={styles.signScrollContent}>
              {ZODIAC_SIGNS.map((sign) => {
                const isSelected = selectedSign === sign.name;
                return (
                  <Pressable
                    key={sign.name}
                    style={[styles.signChip, isSelected && { backgroundColor: `${sign.color}15`, borderColor: sign.color }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setSelectedSign(sign.name);
                    }}
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

          {saveMessage && (
            <View style={[styles.saveMessageRow, saveMessage.type === 'success' ? styles.saveMessageSuccess : styles.saveMessageError]}>
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
          >
            <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnInner}>
              {updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Save size={17} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]} onPress={handleSignOut}>
            <LogOut size={17} color={Colors.danger} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  eyebrow: { color: Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.55, marginTop: 8, marginBottom: 7 },
  title: { fontSize: 34, fontFamily: Fonts.display, fontWeight: '600', color: Colors.textPrimary, marginBottom: 24, letterSpacing: -0.6 },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
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
  displayNameHeader: { fontSize: 25, fontFamily: Fonts.display, fontWeight: '600', color: Colors.textPrimary, letterSpacing: -0.3, textAlign: 'center' },
  email: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.goldDim, borderRadius: 12 },
  adminText: { fontSize: 11, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  signBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  signBadgeSymbol: { fontSize: 14 },
  signBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  formCard: { marginBottom: 20, gap: 4, borderRadius: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
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
  signChipSymbol: { fontSize: 15 },
  signChipLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  checkDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },

  completenessRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, width: '80%' as unknown as number },
  completenessBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  completenessFill: { height: '100%' as unknown as number, borderRadius: 3, overflow: 'hidden' },
  completenessText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  saveMessageRow: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12 },
  saveMessageSuccess: { backgroundColor: Colors.successDim },
  saveMessageError: { backgroundColor: Colors.dangerDim },
  saveMessageText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  saveBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 14 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
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
