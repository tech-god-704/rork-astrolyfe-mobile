import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, KeyRound } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, setSkipAuth } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pin, setPin] = useState('');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!email.trim() || !password.trim()) throw new Error('Please fill in all fields');
      return signIn(email.trim(), password);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(app)/(home)');
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('Login Failed', error.message);
    },
  });

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
              <Text style={styles.title}>Welcome{'\n'}back</Text>
              <Text style={styles.subtitle}>Sign in to continue your cosmic journey</Text>

              <View style={styles.form}>
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
                    placeholder="Password"
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
              </View>

              <Pressable
                style={({ pressed }) => [styles.loginBtn, pressed && styles.btnPressed, (!email.trim() || !password.trim()) && styles.btnDisabled]}
                onPress={() => loginMutation.mutate()}
                disabled={loginMutation.isPending || !email.trim() || !password.trim()}
                testID="login-submit-btn"
              >
                <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                  {loginMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginBtnText}>Sign In</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => router.push('/(auth)/signup')} style={styles.signupLink}>
                <Text style={styles.signupText}>Don't have an account? <Text style={styles.signupTextBold}>Sign up</Text></Text>
              </Pressable>
            </Animated.View>

            {/* Dev bypass */}
            <View style={styles.devBypassRow}>
              <Pressable onPress={() => setShowPinModal(true)} style={({ pressed }) => [styles.devLockBtn, pressed && { opacity: 0.5 }]} hitSlop={12}>
                <KeyRound size={16} color={Colors.textMuted} style={{ opacity: 0.4 }} />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* PIN Modal */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => { setShowPinModal(false); setPin(''); }}>
        <Pressable style={styles.modalOverlay} onPress={() => { setShowPinModal(false); setPin(''); }}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Enter PIN</Text>
            <TextInput
              style={styles.pinInput}
              value={pin}
              onChangeText={(text) => {
                const digits = text.replace(/[^0-9]/g, '').slice(0, 4);
                setPin(digits);
                if (digits === '1985') {
                  setShowPinModal(false);
                  setPin('');
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  setSkipAuth(true);
                  router.replace('/(app)/(home)');
                }
              }}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="----"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              secureTextEntry
            />
            <Text style={styles.modalHint}>4-digit code</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12 },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  title: { fontSize: 38, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10, letterSpacing: -1, lineHeight: 44 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 40, lineHeight: 22 },
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
  loginBtn: { borderRadius: 18, overflow: 'hidden', marginBottom: 20 },
  btnGradient: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  loginBtnText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  signupLink: { alignItems: 'center', paddingVertical: 12 },
  signupText: { fontSize: 15, color: Colors.textSecondary },
  signupTextBold: { color: Colors.purpleLight, fontWeight: '700' },
  devBypassRow: { alignItems: 'center', marginTop: 40, paddingBottom: 20 },
  devLockBtn: { padding: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    padding: 28,
    width: 260,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },
  pinInput: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    letterSpacing: 12,
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: Colors.purple,
  },
  modalHint: { fontSize: 13, color: Colors.textMuted, marginTop: 12 },
});
