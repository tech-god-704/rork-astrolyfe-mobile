import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, User } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');

  const signupMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !password.trim() || !displayName.trim()) throw new Error('Please fill in all fields');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      return signUp(email.trim(), password, displayName.trim(), '', '');
    },
    onSuccess: () => {
      console.log('[Signup] Success');
      router.replace('/(app)/(home)');
    },
    onError: (error: Error) => {
      Alert.alert('Signup Failed', error.message);
    },
  });

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
              <ArrowLeft size={24} color={Colors.textPrimary} />
            </Pressable>

            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Start your astrological journey</Text>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <User size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Display name"
                  placeholderTextColor={Colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                  testID="name-input"
                />
              </View>
              <View style={styles.inputGroup}>
                <Mail size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="email-input"
                />
              </View>
              <View style={styles.inputGroup}>
                <Lock size={18} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  testID="password-input"
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.signupBtn, pressed && styles.btnPressed]}
              onPress={() => signupMutation.mutate()}
              disabled={signupMutation.isPending}
              testID="signup-submit-btn"
            >
              <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                {signupMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signupBtnText}>Create Account</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={() => router.push('/(auth)/login')} style={styles.loginLink}>
              <Text style={styles.loginText}>Already have an account? <Text style={styles.loginTextBold}>Log in</Text></Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800' as const, color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 40 },
  form: { gap: 16, marginBottom: 32 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  signupBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  btnGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  signupBtnText: { fontSize: 17, fontWeight: '700' as const, color: '#fff' },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  loginLink: { alignItems: 'center', paddingVertical: 12 },
  loginText: { fontSize: 15, color: Colors.textSecondary },
  loginTextBold: { color: Colors.purpleLight, fontWeight: '600' as const },
});
