import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, type TextInput as TextInputType } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft, Calendar, MapPin, Star, Check, User, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { ZODIAC_SIGNS } from '@/constants/zodiac';
import { useAuth } from '@/providers/AuthProvider';
import { isValidEmail, getPasswordError, getBirthDateError } from '@/lib/validation';
import AppBackground from '@/components/AppBackground';

export default function OnboardingScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [selectedSign, setSelectedSign] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string; birth?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const nameRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);
  const birthRef = useRef<TextInputType>(null);
  const cityRef = useRef<TextInputType>(null);

  const animateStep = (next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const direction = next > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -direction * 20, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      slideAnim.setValue(direction * 20);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
      ]).start();
    });
  };

  const validateStep0 = (): boolean => {
    const errors: { name?: string; email?: string; password?: string } = {};
    if (displayName.trim() && email.trim()) {
      if (!isValidEmail(email)) errors.email = 'Please enter a valid email';
      const pwErr = password ? getPasswordError(password) : null;
      if (pwErr) errors.password = pwErr;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const validateStep1 = (): boolean => {
    if (birthDate.trim()) {
      const err = getBirthDateError(birthDate);
      if (err) {
        setFieldErrors({ birth: err });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        return false;
      }
    }
    setFieldErrors({});
    return true;
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      setFormError(null);
      const trimmedEmail = email.trim();
      const trimmedName = displayName.trim();
      if (!trimmedEmail || !password || !trimmedName) {
        return 'skip';
      }
      if (!isValidEmail(trimmedEmail)) throw new Error('__validation__');
      const pwErr = getPasswordError(password);
      if (pwErr) throw new Error('__validation__');
      return signUp(trimmedEmail, password, trimmedName, selectedSign || 'Aries', birthDate || '2000-01-01');
    },
    onSuccess: (result) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (result === 'skip') {
        router.replace('/(auth)/login');
        return;
      }
      router.replace('/(app)/(home)');
    },
    onError: (error: Error) => {
      if (error.message === '__validation__') return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setFormError(error.message);
    },
  });

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepIconWrap}>
        <LinearGradient colors={[Colors.purpleDim, 'rgba(97,56,163,0.05)']} style={styles.stepIcon}>
          <Star size={30} color={Colors.purpleLight} />
        </LinearGradient>
      </View>
      <Text style={styles.stepKicker}>CREATE YOUR PROFILE</Text>
      <Text style={styles.stepTitle}>First, tell us about you.</Text>
      <Text style={styles.stepDesc}>Create the private account that will hold your chart, guidance, and conversations.</Text>
      {formError && (
        <View style={styles.formErrorRow}>
          <Text style={styles.formErrorText}>{formError}</Text>
        </View>
      )}
      <View style={styles.form}>
        <View style={[styles.inputGroup, focusedField === 'name' && styles.inputGroupFocused, !!fieldErrors.name && styles.inputGroupError]}>
          <User size={18} color={fieldErrors.name ? Colors.danger : focusedField === 'name' ? Colors.purpleLight : Colors.textMuted} />
          <TextInput ref={nameRef} style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textMuted} value={displayName} onChangeText={(t) => { setDisplayName(t); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined })); }} autoCapitalize="words" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
        </View>
        {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}
        <View style={[styles.inputGroup, focusedField === 'email' && styles.inputGroupFocused, !!fieldErrors.email && styles.inputGroupError]}>
          <Mail size={18} color={fieldErrors.email ? Colors.danger : focusedField === 'email' ? Colors.purpleLight : Colors.textMuted} />
          <TextInput ref={emailRef} style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={(t) => { setEmail(t); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
        </View>
        {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
        <View style={[styles.inputGroup, focusedField === 'password' && styles.inputGroupFocused, !!fieldErrors.password && styles.inputGroupError]}>
          <Lock size={18} color={fieldErrors.password ? Colors.danger : focusedField === 'password' ? Colors.purpleLight : Colors.textMuted} />
          <TextInput ref={passwordRef} style={styles.input} placeholder="Password (min 6 characters)" placeholderTextColor={Colors.textMuted} value={password} onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }} secureTextEntry={!showPassword} returnKeyType="next" onSubmitEditing={() => { if (validateStep0()) animateStep(1); }} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8} style={[styles.eyeBtn, showPassword && styles.eyeBtnActive]}>
            {showPassword ? <EyeOff size={18} color={Colors.purpleLight} /> : <Eye size={18} color={Colors.textMuted} />}
          </Pressable>
        </View>
        {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
      </View>
      <Pressable style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]} onPress={() => { if (validateStep0()) animateStep(1); }}>
        <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnInner}>
          <Text style={styles.nextBtnText}>Next</Text>
          <ArrowRight size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepIconWrap}>
        <LinearGradient colors={[Colors.goldDim, 'rgba(111,178,250,0.03)']} style={styles.stepIcon}>
          <Calendar size={30} color={Colors.gold} />
        </LinearGradient>
      </View>
      <Text style={styles.stepKicker}>BIRTH DATA</Text>
      <Text style={styles.stepTitle}>Map your starting point.</Text>
      <Text style={styles.stepDesc}>Your birth date and place turn a generic horoscope into something personal.</Text>
      <View style={styles.form}>
        <View style={[styles.inputGroup, focusedField === 'birth' && styles.inputGroupFocused, !!fieldErrors.birth && styles.inputGroupError]}>
          <Calendar size={18} color={fieldErrors.birth ? Colors.danger : focusedField === 'birth' ? Colors.gold : Colors.textMuted} />
          <TextInput ref={birthRef} style={styles.input} placeholder="Birth date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted} value={birthDate} onChangeText={(t) => { setBirthDate(t); if (fieldErrors.birth) setFieldErrors((p) => ({ ...p, birth: undefined })); }} returnKeyType="next" onSubmitEditing={() => cityRef.current?.focus()} onFocus={() => setFocusedField('birth')} onBlur={() => setFocusedField(null)} />
        </View>
        {fieldErrors.birth && <Text style={styles.fieldError}>{fieldErrors.birth}</Text>}
        <View style={[styles.inputGroup, focusedField === 'city' && styles.inputGroupFocused]}>
          <MapPin size={18} color={focusedField === 'city' ? Colors.teal : Colors.textMuted} />
          <TextInput ref={cityRef} style={styles.input} placeholder="Birth city (optional)" placeholderTextColor={Colors.textMuted} value={birthCity} onChangeText={setBirthCity} returnKeyType="next" onSubmitEditing={() => { if (validateStep1()) animateStep(2); }} onFocus={() => setFocusedField('city')} onBlur={() => setFocusedField(null)} />
        </View>
      </View>
      <Pressable style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]} onPress={() => { if (validateStep1()) animateStep(2); }}>
        <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnInner}>
          <Text style={styles.nextBtnText}>Next</Text>
          <ArrowRight size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepKicker}>YOUR SUN SIGN</Text>
      <Text style={styles.stepTitle}>Your cosmic signature starts here.</Text>
      <Text style={styles.stepDesc}>Confirm the sign that anchors your daily guidance.</Text>
      <ScrollView style={styles.signGrid} contentContainerStyle={styles.signGridContent} showsVerticalScrollIndicator={false}>
        {ZODIAC_SIGNS.map((sign) => {
          const isSelected = selectedSign === sign.name;
          return (
            <Pressable
              key={sign.name}
              style={({ pressed }) => [styles.signCard, isSelected && { borderColor: sign.color, backgroundColor: `${sign.color}15` }, pressed && { opacity: 0.85 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setSelectedSign(sign.name);
              }}
              accessibilityLabel={`${sign.name} zodiac sign`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.signSymbol, isSelected && { fontSize: 32 }]}>{sign.symbol}</Text>
              <Text style={[styles.signName, isSelected && { color: sign.color }]}>{sign.name}</Text>
              {isSelected && (
                <View style={[styles.checkMark, { backgroundColor: sign.color }]}>
                  <Check size={10} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
      <Pressable
        style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]}
        onPress={() => completeMutation.mutate()}
        disabled={completeMutation.isPending}
      >
        <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnInner}>
          {completeMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextBtnText}>Complete Setup</Text>}
        </LinearGradient>
      </Pressable>
    </View>
  );

  const steps = [renderStep0, renderStep1, renderStep2];

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.progressRow}>
            {step > 0 && (
              <Pressable onPress={() => animateStep(step - 1)} style={styles.backBtn} hitSlop={12}>
                <ArrowLeft size={18} color={Colors.textSecondary} />
              </Pressable>
            )}
            <View style={styles.progressMeta}>
              <Text style={styles.progressLabel}>PROFILE {step + 1} / 3</Text>
              <View style={styles.progressDots}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]}>
                    {i < step && (
                      <View style={styles.progressDotCompleted}>
                        <Check size={8} color={Colors.paperInk} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
            <Pressable onPress={() => { if (step < 2) { animateStep(step + 1); } else { completeMutation.mutate(); } }} style={styles.skipBtn} hitSlop={8} disabled={completeMutation.isPending}>
              <Text style={[styles.skipBtnText, completeMutation.isPending && { opacity: 0.4 }]}>Later</Text>
            </Pressable>
          </View>
          <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            {steps[step]()}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 14, alignItems: 'center', paddingHorizontal: 24, minHeight: 64 },
  progressMeta: { alignItems: 'center', gap: 7 },
  progressLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  backBtn: { position: 'absolute', left: 24, top: 18 },
  progressDot: { width: 34, height: 3, borderRadius: 2, backgroundColor: Colors.bgCardBorder, overflow: 'hidden' },
  progressDotActive: { backgroundColor: Colors.gold },
  progressDotCompleted: { width: 34, height: 3, borderRadius: 2, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { position: 'absolute', right: 24, top: 18 },
  skipBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  stepContent: { flex: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20 },
  stepIconWrap: { marginBottom: 20 },
  stepIcon: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.bgCardBorder },
  stepKicker: { color: Colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.7, marginBottom: 10 },
  stepTitle: { fontSize: 34, fontFamily: Fonts.display, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10, letterSpacing: -0.7 },
  stepDesc: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary, marginBottom: 28 },
  form: { gap: 14, marginBottom: 28 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 16,
    height: 58,
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
  fieldError: { fontSize: 12, color: Colors.danger, marginLeft: 16, marginTop: -6 },
  formErrorRow: { backgroundColor: Colors.dangerDim, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  formErrorText: { fontSize: 13, color: Colors.danger, fontWeight: '600' },
  nextBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 4 },
  nextBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  signGrid: { flex: 1, marginBottom: 12 },
  signGridContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingBottom: 16 },
  signCard: {
    width: '29%' as unknown as number,
    aspectRatio: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signSymbol: { fontSize: 28 },
  signName: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  checkMark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
