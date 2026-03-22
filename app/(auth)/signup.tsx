import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const signupMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !password.trim() || !displayName.trim()) throw new Error('Please fill in all fields');
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      return signUp(email.trim(), password, displayName.trim(), '', '');
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(app)/(home)');
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Signup Failed', error.message);
    },
  });

  const isValid = email.trim() && password.trim() && displayName.trim();

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]} testID="back-btn">
              <ArrowLeft size={22} color={Colors.textPrimary} />
            </Pressable>

            <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
              <Text style={styles.title}>Create{'\n'}account</Text>
              <Text style={styles.subtitle}>Start your astrological journey</Text>

              <View style={styles.form}>
                <View style={[styles.inputGroup, focusedField === 'name' && styles.inputGroupFocused]}>
                  <User size={18} color={focusedField === 'name' ? Colors.purpleLight : Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Display name"
                    placeholderTextColor={Colors.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    testID="name-input"
                  />
                </View>
                <View style={[styles.inputGroup, focusedField === 'email' && styles.inputGroupFocused]}>
                  <Mail size={18} color={focusedField === 'email' ? Colors.purpleLight : Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    testID="email-input"
                  />
                </View>
                <View style={[styles.inputGroup, focusedField === 'password' && styles.inputGroupFocused]}>
                  <Lock size={18} color={focusedField === 'password' ? Colors.purpleLight : Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password (min 6 characters)"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    testID="password-input"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                    {showPassword ? <EyeOff size={18} color={Colors.textMuted} /> : <Eye size={18} color={Colors.textMuted} />}
                  </Pressable>
                </View>
                {password.length > 0 && password.length < 6 && (
                  <Text style={styles.passwordHint}>Password must be at least 6 characters</Text>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [styles.signupBtn, pressed && styles.btnPressed, !isValid && styles.btnDisabled]}
                onPress={() => signupMutation.mutate()}
                disabled={signupMutation.isPending || !isValid}
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
            </Animated.View>
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
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 36, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, letterSpacing: -1, lineHeight: 42 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 36, lineHeight: 22 },
  form: { gap: 14, marginBottom: 28 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 16,
    height: 58,
    gap: 12,
  },
  inputGroupFocused: {
    borderColor: Colors.purpleGlow,
    backgroundColor: Colors.bgInputFocused,
  },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  passwordHint: { fontSize: 12, color: Colors.accent, marginLeft: 4, marginTop: -4 },
  signupBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 24 },
  btnGradient: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  signupBtnText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  loginLink: { alignItems: 'center', paddingVertical: 12 },
  loginText: { fontSize: 15, color: Colors.textSecondary },
  loginTextBold: { color: Colors.purpleLight, fontWeight: '700' },
});
