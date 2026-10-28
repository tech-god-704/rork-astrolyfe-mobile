import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, type TextInput as TextInputType } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft, Calendar, Clock, MapPin, Star, Check, User, Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { searchCities, matchCity, type City } from '@/data/cities';
import { useAuth } from '@/providers/AuthProvider';
import { isValidEmail, getPasswordError, getBirthDateError } from '@/lib/validation';
import AppBackground from '@/components/AppBackground';
import { useThemedStyles } from '@/providers/ThemeProvider';

const STEP_META = [
  { label: 'ACCOUNT', detail: 'Your private space' },
  { label: 'BIRTH', detail: 'Where and when you were born' },
] as const;

function parseTime(value: string): { hour: number; minute: number } | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2], 10);
  return hour <= 23 && minute <= 59 ? { hour, minute } : null;
}

export default function OnboardingScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthTime, setBirthTime] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [pickedCity, setPickedCity] = useState<City | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string; birth?: string; time?: string; city?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const nameRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);
  const birthRef = useRef<TextInputType>(null);
  const timeRef = useRef<TextInputType>(null);
  const cityRef = useRef<TextInputType>(null);

  const resolvedCity = pickedCity ?? matchCity(birthCity);
  const cityMatches = !resolvedCity && birthCity.trim().length >= 2 ? searchCities(birthCity.split(',')[0], 5) : [];

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
    if (!displayName.trim()) errors.name = 'Tell us what you would like to be called';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!isValidEmail(email)) errors.email = 'Please enter a valid email';
    if (!password) errors.password = 'Password is required';
    else {
      const pwErr = getPasswordError(password);
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
    const errors: { birth?: string; time?: string; city?: string } = {};
    if (birthDate.trim()) {
      const err = getBirthDateError(birthDate);
      if (err) errors.birth = err;
    }
    if (birthTime.trim() && !parseTime(birthTime)) errors.time = 'Use 24-hour HH:MM, e.g. 14:30';
    if (birthCity.trim() && !resolvedCity) errors.city = 'Pick your birth city from the list. The nearest big city in the same time zone works.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const completeMutation = useMutation({
    mutationFn: async ({ skipBirth }: { skipBirth: boolean }) => {
      setFormError(null);
      const trimmedEmail = email.trim();
      const trimmedName = displayName.trim();
      if (!trimmedEmail || !password || !trimmedName) {
        throw new Error('__validation__');
      }
      if (!isValidEmail(trimmedEmail)) throw new Error('__validation__');
      const pwErr = getPasswordError(password);
      if (pwErr) throw new Error('__validation__');
      if (skipBirth) return signUp(trimmedEmail, password, trimmedName, '', '', '');
      if (!validateStep1()) throw new Error('__validation__');
      const time = parseTime(birthTime);
      // The sun sign is worked out from the birth date in signUp, not picked by hand.
      return signUp(trimmedEmail, password, trimmedName, '', birthDate.trim(), resolvedCity ? `${resolvedCity.name}, ${resolvedCity.country}` : '', {
        birthHour: time?.hour,
        birthMinute: time?.minute,
        city: resolvedCity,
      });
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

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepIconWrap}>
        <LinearGradient colors={[Colors.purpleDim, 'rgba(97,56,163,0.05)']} style={styles.stepIcon}>
          <Star size={30} color={Colors.purpleLight} />
        </LinearGradient>
      </View>
      <Text style={styles.stepKicker}>CREATE YOUR PROFILE</Text>
      <Text style={styles.stepTitle}>Let&apos;s make it personal.</Text>
      <Text style={styles.stepDesc}>Create the private account that keeps your places, soulmate and reports together.</Text>
      {formError && (
        <View style={styles.formErrorRow}>
          <Text style={styles.formErrorText}>{formError}</Text>
        </View>
      )}
      <View style={styles.form}>
        <Text style={styles.fieldLabel}>Your name</Text>
        <View style={[styles.inputGroup, focusedField === 'name' && styles.inputGroupFocused, !!fieldErrors.name && styles.inputGroupError]}>
          <User size={18} color={fieldErrors.name ? Colors.danger : focusedField === 'name' ? Colors.purpleLight : Colors.textMuted} />
          <TextInput ref={nameRef} style={styles.input} placeholder="How should we greet you?" placeholderTextColor={Colors.textMuted} value={displayName} onChangeText={(t) => { setDisplayName(t); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: undefined })); }} autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} accessibilityLabel="Your name" />
        </View>
        {fieldErrors.name && <Text style={styles.fieldError}>{fieldErrors.name}</Text>}
        <Text style={styles.fieldLabel}>Email address</Text>
        <View style={[styles.inputGroup, focusedField === 'email' && styles.inputGroupFocused, !!fieldErrors.email && styles.inputGroupError]}>
          <Mail size={18} color={fieldErrors.email ? Colors.danger : focusedField === 'email' ? Colors.purpleLight : Colors.textMuted} />
          <TextInput ref={emailRef} style={styles.input} placeholder="you@example.com" placeholderTextColor={Colors.textMuted} value={email} onChangeText={(t) => { setEmail(t); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} accessibilityLabel="Email address" />
        </View>
        {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
        <Text style={styles.fieldLabel}>Password</Text>
        <View style={[styles.inputGroup, focusedField === 'password' && styles.inputGroupFocused, !!fieldErrors.password && styles.inputGroupError]}>
          <Lock size={18} color={fieldErrors.password ? Colors.danger : focusedField === 'password' ? Colors.purpleLight : Colors.textMuted} />
          <TextInput ref={passwordRef} style={styles.input} placeholder="At least 6 characters" placeholderTextColor={Colors.textMuted} value={password} onChangeText={(t) => { setPassword(t); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined })); }} secureTextEntry={!showPassword} autoComplete="new-password" textContentType="newPassword" returnKeyType="next" onSubmitEditing={() => { if (validateStep0()) animateStep(1); }} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} accessibilityLabel="Password" />
          <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={10} style={[styles.eyeBtn, showPassword && styles.eyeBtnActive]} accessibilityRole="button" accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={18} color={Colors.purpleLight} /> : <Eye size={18} color={Colors.textMuted} />}
          </Pressable>
        </View>
        {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
      </View>
      <View style={styles.trustRow}>
        <ShieldCheck size={14} color={Colors.success} />
        <Text style={styles.trustText}>Your personal details stay private and editable.</Text>
      </View>
      <Pressable style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]} onPress={() => { if (validateStep0()) animateStep(1); }} accessibilityRole="button">
        <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnInner}>
          <Text style={styles.nextBtnText}>Continue to birth details</Text>
          <ArrowRight size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderStep1 = () => (
    <ScrollView style={styles.flex} contentContainerStyle={styles.stepScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={styles.stepIconWrap}>
        <LinearGradient colors={[Colors.goldDim, 'rgba(111,178,250,0.03)']} style={styles.stepIcon}>
          <MapPin size={30} color={Colors.gold} />
        </LinearGradient>
      </View>
      <Text style={styles.stepKicker}>BIRTH DETAILS</Text>
      <Text style={styles.stepTitle}>Where and when were you born?</Text>
      <Text style={styles.stepDesc}>
        Your map, your compass and your best dates are all worked out from this moment. You can add or change it later.
      </Text>
      {formError && (
        <View style={styles.formErrorRow}>
          <Text style={styles.formErrorText}>{formError}</Text>
        </View>
      )}
      <View style={styles.form}>
        <View style={styles.optionalLabelRow}>
          <Text style={styles.fieldLabel}>Birth date</Text>
          <Text style={styles.optionalLabel}>OPTIONAL</Text>
        </View>
        <View style={[styles.inputGroup, focusedField === 'birth' && styles.inputGroupFocused, !!fieldErrors.birth && styles.inputGroupError]}>
          <Calendar size={18} color={fieldErrors.birth ? Colors.danger : focusedField === 'birth' ? Colors.gold : Colors.textMuted} />
          <TextInput ref={birthRef} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.textMuted} value={birthDate} onChangeText={(t) => { setBirthDate(t); if (fieldErrors.birth) setFieldErrors((p) => ({ ...p, birth: undefined })); }} keyboardType="numbers-and-punctuation" autoComplete="birthdate-full" returnKeyType="next" onSubmitEditing={() => timeRef.current?.focus()} onFocus={() => setFocusedField('birth')} onBlur={() => setFocusedField(null)} accessibilityLabel="Birth date, optional" />
        </View>
        {fieldErrors.birth && <Text style={styles.fieldError}>{fieldErrors.birth}</Text>}

        <View style={styles.optionalLabelRow}>
          <Text style={styles.fieldLabel}>Birth time</Text>
          <Text style={styles.optionalLabel}>OPTIONAL</Text>
        </View>
        <View style={[styles.inputGroup, focusedField === 'time' && styles.inputGroupFocused, !!fieldErrors.time && styles.inputGroupError]}>
          <Clock size={18} color={fieldErrors.time ? Colors.danger : focusedField === 'time' ? Colors.gold : Colors.textMuted} />
          <TextInput ref={timeRef} style={styles.input} placeholder="HH:MM (24-hour, e.g. 14:30)" placeholderTextColor={Colors.textMuted} value={birthTime} onChangeText={(t) => { setBirthTime(t); if (fieldErrors.time) setFieldErrors((p) => ({ ...p, time: undefined })); }} keyboardType="numbers-and-punctuation" returnKeyType="next" onSubmitEditing={() => cityRef.current?.focus()} onFocus={() => setFocusedField('time')} onBlur={() => setFocusedField(null)} accessibilityLabel="Birth time, optional" />
        </View>
        {fieldErrors.time && <Text style={styles.fieldError}>{fieldErrors.time}</Text>}

        <View style={styles.optionalLabelRow}>
          <Text style={styles.fieldLabel}>Birth city</Text>
          <Text style={styles.optionalLabel}>OPTIONAL</Text>
        </View>
        <View style={[styles.inputGroup, focusedField === 'city' && styles.inputGroupFocused, !!fieldErrors.city && styles.inputGroupError]}>
          <MapPin size={18} color={fieldErrors.city ? Colors.danger : focusedField === 'city' ? Colors.teal : Colors.textMuted} />
          <TextInput ref={cityRef} style={styles.input} placeholder="Search your birth city" placeholderTextColor={Colors.textMuted} value={birthCity} onChangeText={(t) => { setBirthCity(t); setPickedCity(null); if (fieldErrors.city) setFieldErrors((p) => ({ ...p, city: undefined })); }} autoCapitalize="words" autoCorrect={false} returnKeyType="done" onFocus={() => setFocusedField('city')} onBlur={() => setFocusedField(null)} accessibilityLabel="Birth city, optional" />
        </View>
        {cityMatches.map((c) => (
          <Pressable
            key={c.name}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setBirthCity(`${c.name}, ${c.country}`);
              setPickedCity(c);
              setFieldErrors((p) => ({ ...p, city: undefined }));
            }}
            style={({ pressed }) => [styles.cityOption, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${c.country}`}
          >
            <MapPin size={13} color={Colors.purpleLight} />
            <Text style={styles.cityOptionName}>{c.name}</Text>
            <Text style={styles.cityOptionCountry}>{c.country}</Text>
          </Pressable>
        ))}
        {fieldErrors.city ? (
          <Text style={styles.fieldError}>{fieldErrors.city}</Text>
        ) : birthCity.trim() && !resolvedCity ? (
          <Text style={styles.cityHint}>Pick from the list. Not there? Choose the nearest big city in the same time zone.</Text>
        ) : null}
      </View>
      <View style={styles.valueNote}>
        <Text style={styles.valueNoteTitle}>Why the exact time matters</Text>
        <Text style={styles.valueNoteText}>Every hour of birth time moves your lines about 1,000 miles. Without it you still get your sign and forecast, but not your map.</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]}
        onPress={() => completeMutation.mutate({ skipBirth: false })}
        disabled={completeMutation.isPending}
        accessibilityRole="button"
        accessibilityState={{ disabled: completeMutation.isPending }}
      >
        <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnInner}>
          {completeMutation.isPending ? <ActivityIndicator color="#fff" /> : (
            <>
              <Text style={styles.nextBtnText}>Create my map</Text>
              <ArrowRight size={18} color="#fff" />
            </>
          )}
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );

  const steps = [renderStep0, renderStep1];

  return (
    <View style={styles.container}>
      <AppBackground />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.progressRow}>
            <Pressable onPress={() => step > 0 ? animateStep(step - 1) : router.back()} style={styles.backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel={step > 0 ? 'Previous onboarding step' : 'Back to welcome'}>
              <ArrowLeft size={18} color={Colors.textSecondary} />
            </Pressable>
            <View style={styles.progressMeta}>
              <Text style={styles.progressLabel}>STEP {step + 1} OF 2 · {STEP_META[step].label}</Text>
              <Text style={styles.progressDetail}>{STEP_META[step].detail}</Text>
              <View style={styles.progressDots}>
                {[0, 1].map((i) => (
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
            {step === 1 && (
              <Pressable onPress={() => completeMutation.mutate({ skipBirth: true })} disabled={completeMutation.isPending} style={styles.skipBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Skip birth details for now">
                <Text style={styles.skipBtnText}>Skip</Text>
              </Pressable>
            )}
          </View>
          <Animated.View style={[styles.flex, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
            {steps[step]()}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = () => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 14, alignItems: 'center', paddingHorizontal: 24, minHeight: 64 },
  progressMeta: { alignItems: 'center' },
  progressLabel: { color: Colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  progressDetail: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 4, marginBottom: 7 },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  backBtn: { position: 'absolute', left: 24, top: 18 },
  progressDot: { width: 34, height: 3, borderRadius: 2, backgroundColor: Colors.bgCardBorder, overflow: 'hidden' },
  progressDotActive: { backgroundColor: Colors.gold },
  progressDotCompleted: { width: 34, height: 3, borderRadius: 2, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { position: 'absolute', right: 24, top: 18 },
  skipBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  stepContent: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 },
  stepScroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40 },
  stepIconWrap: { marginBottom: 16 },
  stepIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.bgCardBorder },
  stepKicker: { color: Colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.7, marginBottom: 10 },
  stepTitle: { fontSize: 34, fontFamily: Fonts.display, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10, letterSpacing: -0.7 },
  stepDesc: { fontSize: 15, lineHeight: 22, color: Colors.textSecondary, marginBottom: 20 },
  form: { marginBottom: 16 },
  fieldLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 11 },
  optionalLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionalLabel: { color: Colors.textFaint, fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 11 },
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
  fieldError: { fontSize: 12, color: Colors.danger, marginLeft: 4, marginTop: 6 },
  formErrorRow: { backgroundColor: Colors.dangerDim, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 8 },
  formErrorText: { fontSize: 13, color: Colors.danger, fontWeight: '600' },
  trustRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  trustText: { flex: 1, color: Colors.textMuted, fontSize: 11, lineHeight: 16 },
  valueNote: { borderRadius: 14, borderWidth: 1, borderColor: Colors.bgCardBorder, backgroundColor: Colors.bgCard, padding: 14, marginBottom: 16 },
  valueNoteTitle: { color: Colors.textPrimary, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  valueNoteText: { color: Colors.textMuted, fontSize: 11, lineHeight: 17 },
  nextBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  nextBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.44 },
  cityOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.bgCardBorder },
  cityOptionName: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  cityOptionCountry: { color: Colors.textMuted, fontSize: 13, flex: 1 },
  cityHint: { color: Colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 6, marginLeft: 4 },
});
