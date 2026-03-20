import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Save, Shield } from 'lucide-react-native';
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
  const [selectedSign, setSelectedSign] = useState<string>('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setBirthDate(profile.birth_date ?? '');
      setSelectedSign(profile.zodiac_sign ?? '');
    }
  }, [profile]);

  const zodiac = selectedSign ? getZodiacByName(selectedSign) : null;

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName.trim(),
          birth_date: birthDate.trim() || null,
          zodiac_sign: selectedSign || null,
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
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Profile</Text>

          <View style={styles.avatarSection}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{zodiac?.symbol ?? (displayName[0] ?? '?')}</Text>
            </View>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Shield size={14} color={Colors.gold} />
                <Text style={styles.adminText}>Admin</Text>
              </View>
            )}
          </View>

          <GlassCard style={styles.formCard}>
            <Text style={styles.fieldLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Birth Date</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Zodiac Sign</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.signScroll} contentContainerStyle={styles.signScrollContent}>
              {ZODIAC_SIGNS.map((sign) => (
                <Pressable
                  key={sign.name}
                  style={[styles.signChip, selectedSign === sign.name && styles.signChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setSelectedSign(sign.name);
                  }}
                >
                  <Text style={styles.signChipSymbol}>{sign.symbol}</Text>
                  <Text style={[styles.signChipLabel, selectedSign === sign.name && styles.signChipLabelActive]}>{sign.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </GlassCard>

          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.8 }]}
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
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]} onPress={handleSignOut}>
            <LogOut size={18} color={Colors.danger} />
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
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginTop: 8, marginBottom: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.purpleDim,
    borderWidth: 2,
    borderColor: Colors.purpleGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, color: Colors.purpleLight },
  email: { fontSize: 14, color: Colors.textSecondary },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 12 },
  adminText: { fontSize: 12, fontWeight: '700', color: Colors.gold },
  formCard: { marginBottom: 20, gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  signScroll: { marginTop: 4 },
  signScrollContent: { gap: 8, paddingVertical: 4 },
  signChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
  },
  signChipActive: { backgroundColor: Colors.purpleDim, borderColor: Colors.purple },
  signChipSymbol: { fontSize: 16 },
  signChipLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  signChipLabelActive: { color: Colors.purpleLight },
  saveBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  logoutText: { fontSize: 15, fontWeight: '600', color: Colors.danger },
});
