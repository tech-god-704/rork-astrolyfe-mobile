import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated, Image, type TextInput as TextInputType } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, Sparkles } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { isValidEmail, getPasswordError } from '@/lib/validation';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';

export default function SignupScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const nameRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideUp]);

  const clearErrors = () => { setFormError(null); setFieldErrors({}); };

  const validate = (): boolean => {
    const errors: { name?: string; email?: string; password?: string } = {};
    if (!displayName.trim()) errors.name = 'Name is required';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(email)) errors.email = 'Please enter a valid email';
    if (!password.trim()) errors.password = 'Password is required';
    else {
      const pwErr = getPasswordError(password);
      if (pwErr) errors.password = pwErr;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    return true;
  };

  const signupMutation = useMutation({
    mutationFn: async () => {
      clearErrors();
      if (!validate()) throw new Error('__validation__');
      return signUp(email.trim(), password, displayName.trim(), '', '');
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(app)/(home)');
    },
    onError: (error: Error) => {
      if (error.message === '__validation__') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setFormError(error.message);
    },
  });

  const isValid = Boolean(email.trim() && password.trim() && displayName.trim());

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
            <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]} testID="back-btn" hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
              <ArrowLeft size={22} color={Colors.textPrimary} />
            </Pressable>

            <Animated.View style={[styles.sheet, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
              <View style={styles.authHero}>
                <Image source={require('../../assets/images/icon.png')} style={styles.authHeroImage} resizeMode="cover" />
                <LinearGradient colors={['rgba(9,5,27,0.02)', Colors.bgCardSolid]} style={StyleSheet.absoluteFillObject} />
                <View style={styles.authBrand}>
                  <Sparkles size={13} color={Colors.lavenderIce} />
                  <Text style={styles.authBrandText}>ASTROLYFE</Text>
                </View>
              </View>
              <Text style={styles.eyebrow}>CREATE YOUR COSMIC PROFILE</Text>
              <Text style={styles.title}>Make AstroLyfe{'\n'}yours.</Text>
              <Text style={styles.subtitle}>One private space for your chart, daily guidance, and cosmic conversations.</Text>

              {formError && (
                <View style={styles.formErrorRow} accessibilityLiveRegion="polite">
                  <Text style={styles.formErrorText}>{formError}</Text>
                </View>
              )}

              <View style={styles.form}>
                <Text style={styles.fieldLabel}>Your name</Text>
                <View style={[styles.inputGroup, focusedField === 'name' && styles.inputGroupFocused, !!fieldErrors.name && styles.inputGroupError]}>
                  <User size={18} color={fieldErrors.name ? Colors.danger : focusedField === 'name' ? Colors.purpleLight : Colors.textMuted} />
                  <TextInput
                    ref={nameRef}
                    style={styles.input}
                    placeholder="How should we greet you?"
                    placeholderTextColor={Colors.textMuted}
                    value={displayName}
                    onChangeText={(t) => { setDisplayName(t); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined })); }}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    testID="name-input"
                    accessibilityLabel="Your name"
                  />
                </View>
                {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}

                <Text style={styles.fieldLabel}>Email address</Text>
                <View style={[styles.inputGroup, focusedField === 'email' && styles.inputGroupFocused, !!fieldErrors.email && styles.inputGroupError]}>
                  <Mail size={18} color={fieldErrors.email ? Colors.danger : focusedField === 'email' ? Colors.purpleLight : Colors.textMuted} />
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={(t) => { setEmail(t); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    testID="email-input"
                    accessibilityLabel="Email address"
                  />
                </View>
                {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}

                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[styles.inputGroup, focusedField === 'password' && styles.inputGroupFocused, !!fieldErrors.password && styles.inputGroupError]}>
                  <Lock size={18} color={fieldErrors.password ? Colors.danger : focusedField === 'password' ? Colors.purpleLight : Colors.textMuted} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="At least 6 characters"
                    placeholderTextColor={Colors.textMuted}
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="go"
                    onSubmitEditing={() => { if (isValid) signupMutation.mutate(); }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    testID="password-input"
                    accessibilityLabel="Password"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} style={[styles.eyeBtn, showPassword && styles.eyeBtnActive]} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={18} color={Colors.purpleLight} /> : <Eye size={18} color={Colors.textMuted} />}
                  </Pressable>
                </View>
                {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
              </View>

              <Pressable
                style={({ pressed }) => [styles.signupBtn, pressed && styles.btnPressed, !isValid && styles.btnDisabled]}
                onPress={() => signupMutation.mutate()}
                disabled={signupMutation.isPending || !isValid}
                testID="signup-submit-btn"
                accessibilityRole="button"
                accessibilityState={{ disabled: signupMutation.isPending || !isValid, busy: signupMutation.isPending }}
              >
                <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btnGradient}>
                  {signupMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.signupBtnText}>Create my account</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => router.push('/(auth)/login')} style={styles.loginLink} accessibilityRole="link">
                <Text style={styles.loginText}>Already have an account? <Text style={styles.loginTextBold}>Log in</Text></Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgCardSolid,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  sheet: {
    backgroundColor: Colors.bgCardSolid,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.20)',
    padding: 22,
    overflow: 'hidden',
  },
  authHero: { height: 128, marginHorizontal: -22, marginTop: -22, marginBottom: 22, overflow: 'hidden' },
  authHeroImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: 180, top: -26 },
  authBrand: { position: 'absolute', left: 22, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  authBrandText: { color: Colors.lavenderIce, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  eyebrow: { fontSize: 10, color: Colors.gold, fontWeight: '800', letterSpacing: 1.8, marginBottom: 13 },
  title: { fontSize: 38, fontFamily: Fonts.display, fontWeight: '800', color: Colors.textPrimary, marginBottom: 12, letterSpacing: -1.2, lineHeight: 41 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, marginBottom: 22, lineHeight: 22 },
  form: { marginBottom: 24 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 14, letterSpacing: 0.2 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  inputGroupFocused: {
    borderColor: Colors.purpleGlow,
    backgroundColor: Colors.bgInputFocused,
  },
  inputGroupError: {
    borderColor: Colors.danger,
  },
  input: { flex: 1, fontSize: 16, color: Colors.textPrimary },
  eyeBtn: { padding: 4, borderRadius: 12 },
  eyeBtnActive: { backgroundColor: 'rgba(97,56,163,0.20)' },
  fieldError: { fontSize: 12, color: Colors.danger, marginLeft: 4, marginTop: 6 },
  formErrorRow: { backgroundColor: Colors.dangerDim, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  formErrorText: { fontSize: 13, color: Colors.danger, fontWeight: '600' },
  signupBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 18 },
  btnGradient: { paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  signupBtnText: { fontSize: 17, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  loginLink: { alignItems: 'center', paddingVertical: 12 },
  loginText: { fontSize: 15, color: Colors.textSecondary },
  loginTextBold: { color: Colors.gold, fontWeight: '700' },
});
