import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Save, Shield, Star, Calendar, Check, Settings, MapPin, Clock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile, isAdmin } = useAuth();
  const [displayName, setDisplayName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [selectedSign, setSelectedSign] = useState<string>('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('Not authenticated');

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
        .from('users')
        .update({
          display_name: displayName.trim(),
          birth_date: birthDate.trim() || null,
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
      Alert.alert('Saved', 'Your profile has been updated.');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
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
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Profile</Text>

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
          </View>

          {/* Form */}
          <GlassCard style={styles.formCard}>
            <Text style={styles.sectionLabel}>Personal Information</Text>

            <Text style={styles.fieldLabel}>Display Name</Text>
            <View style={[styles.inputWrap, focusedField === 'name' && styles.inputWrapFocused]}>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Text style={styles.fieldLabel}>Birth Date</Text>
            <View style={[styles.inputWrap, focusedField === 'birth' && styles.inputWrapFocused]}>
              <Calendar size={16} color={focusedField === 'birth' ? Colors.purpleLight : Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={birthDate}
                onChangeText={setBirthDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textMuted}
                onFocus={() => setFocusedField('birth')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Text style={styles.fieldLabel}>Birth Time</Text>
            <View style={[styles.inputWrap, focusedField === 'time' && styles.inputWrapFocused]}>
              <Clock size={16} color={focusedField === 'time' ? Colors.purpleLight : Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={birthTime}
                onChangeText={setBirthTime}
                placeholder="HH:MM (24hr, e.g. 14:30)"
                placeholderTextColor={Colors.textMuted}
                onFocus={() => setFocusedField('time')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Text style={styles.fieldLabel}>Birth City</Text>
            <View style={[styles.inputWrap, focusedField === 'city' && styles.inputWrapFocused]}>
              <MapPin size={16} color={focusedField === 'city' ? Colors.purpleLight : Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={birthCity}
                onChangeText={setBirthCity}
                placeholder="City, State/Country"
                placeholderTextColor={Colors.textMuted}
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, marginBottom: 24, letterSpacing: -0.5 },

  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarOuter: { marginBottom: 14 },
  avatarGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 46,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 36, color: Colors.purpleLight },
  displayNameHeader: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3, textAlign: 'center' },
  email: { fontSize: 14, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: Colors.goldDim, borderRadius: 12 },
  adminText: { fontSize: 11, fontWeight: '700', color: Colors.gold, textTransform: 'uppercase', letterSpacing: 0.5 },
  signBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  signBadgeSymbol: { fontSize: 14 },
  signBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  formCard: { marginBottom: 20, gap: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  inputWrapFocused: { borderColor: Colors.purpleGlow, backgroundColor: Colors.bgInputFocused },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },

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
    borderWidth: 1.5,
    borderColor: Colors.bgInputBorder,
  },
  signChipSymbol: { fontSize: 15 },
  signChipLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  checkDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },

  saveBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 14 },
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
