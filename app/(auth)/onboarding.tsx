import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft, Calendar, MapPin, Star, Check } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { ZODIAC_SIGNS } from '@/constants/zodiac';
import { useAuth } from '@/providers/AuthProvider';

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const completeMutation = useMutation({
    mutationFn: async () => {
      const trimmedEmail = email.trim();
      const trimmedName = displayName.trim();
      if (!trimmedEmail || !password || !trimmedName) {
        return 'skip';
      }
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
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
      Alert.alert('Error', error.message);
    },
  });

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepIconWrap}>
        <LinearGradient colors={[Colors.purpleDim, 'rgba(124,58,237,0.05)']} style={styles.stepIcon}>
          <Star size={30} color={Colors.purpleLight} />
        </LinearGradient>
      </View>
      <Text style={styles.stepTitle}>Who are you?</Text>
      <Text style={styles.stepDesc}>Let's start with the basics</Text>
      <View style={styles.form}>
        <View style={[styles.inputGroup, focusedField === 'name' && styles.inputGroupFocused]}>
          <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textMuted} value={displayName} onChangeText={setDisplayName} autoCapitalize="words" onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} />
        </View>
        <View style={[styles.inputGroup, focusedField === 'email' && styles.inputGroupFocused]}>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} />
        </View>
        <View style={[styles.inputGroup, focusedField === 'password' && styles.inputGroupFocused]}>
          <TextInput style={styles.input} placeholder="Password (min 6 characters)" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} />
        </View>
      </View>
      <Pressable style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]} onPress={() => animateStep(1)}>
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
        <LinearGradient colors={[Colors.goldDim, 'rgba(251,191,36,0.02)']} style={styles.stepIcon}>
          <Calendar size={30} color={Colors.gold} />
        </LinearGradient>
      </View>
      <Text style={styles.stepTitle}>When were you born?</Text>
      <Text style={styles.stepDesc}>We'll calculate your natal chart</Text>
      <View style={styles.form}>
        <View style={[styles.inputGroup, focusedField === 'birth' && styles.inputGroupFocused]}>
          <Calendar size={18} color={focusedField === 'birth' ? Colors.gold : Colors.textMuted} />
          <TextInput style={styles.input} placeholder="Birth date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted} value={birthDate} onChangeText={setBirthDate} onFocus={() => setFocusedField('birth')} onBlur={() => setFocusedField(null)} />
        </View>
        <View style={[styles.inputGroup, focusedField === 'city' && styles.inputGroupFocused]}>
          <MapPin size={18} color={focusedField === 'city' ? Colors.teal : Colors.textMuted} />
          <TextInput style={styles.input} placeholder="Birth city (optional)" placeholderTextColor={Colors.textMuted} value={birthCity} onChangeText={setBirthCity} onFocus={() => setFocusedField('city')} onBlur={() => setFocusedField(null)} />
        </View>
      </View>
      <Pressable style={({ pressed }) => [styles.nextBtn, pressed && styles.btnPressed]} onPress={() => animateStep(2)}>
        <LinearGradient colors={[Colors.purple, Colors.indigo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnInner}>
          <Text style={styles.nextBtnText}>Next</Text>
          <ArrowRight size={18} color="#fff" />
        </LinearGradient>
      </Pressable>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your sign?</Text>
      <Text style={styles.stepDesc}>Select your zodiac sign</Text>
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
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientMid, Colors.gradientEnd]} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.progressRow}>
            {step > 0 && (
              <Pressable onPress={() => animateStep(step - 1)} style={styles.backBtn} hitSlop={12}>
                <ArrowLeft size={18} color={Colors.textSecondary} />
              </Pressable>
            )}
            <View style={styles.progressDots}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]}>
                  {i < step && (
                    <View style={styles.progressDotCompleted}>
                      <Check size={8} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
            </View>
            <Pressable onPress={() => { if (step < 2) { animateStep(step + 1); } else { completeMutation.mutate(); } }} style={styles.skipBtn} hitSlop={8}>
              <Text style={styles.skipBtnText}>Skip</Text>
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
  progressRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 18, alignItems: 'center', paddingHorizontal: 24 },
  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, flex: 1 },
  backBtn: { position: 'absolute', left: 24, top: 14 },
  progressDot: { width: 44, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressDotActive: { backgroundColor: Colors.purple },
  progressDotCompleted: { width: 20, height: 5, borderRadius: 3, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center' },
  skipBtn: { position: 'absolute', right: 24, top: 14 },
  skipBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' },
  stepContent: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  stepIconWrap: { marginBottom: 20 },
  stepIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stepTitle: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8, letterSpacing: -0.5 },
  stepDesc: { fontSize: 16, color: Colors.textSecondary, marginBottom: 28 },
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
  nextBtn: { borderRadius: 18, overflow: 'hidden', marginTop: 4 },
  nextBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 17, gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  signGrid: { flex: 1, marginBottom: 12 },
  signGridContent: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingBottom: 16 },
  signCard: {
    width: '29%' as unknown as number,
    aspectRatio: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    borderWidth: 1.5,
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
