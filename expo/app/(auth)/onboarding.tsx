import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Animated, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Calendar, MapPin, Star } from 'lucide-react-native';
import { useMutation } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { ZODIAC_SIGNS } from '@/constants/zodiac';
import { useAuth } from '@/providers/AuthProvider';

export default function OnboardingScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [step, setStep] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [birthCity, setBirthCity] = useState<string>('');
  const [selectedSign, setSelectedSign] = useState<string>('');

  const animateStep = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(next);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const completeMutation = useMutation({
    mutationFn: async () => {
      const trimmedEmail = email.trim();
      const trimmedName = displayName.trim();
      if (!trimmedEmail || !password || !trimmedName) {
        console.log('[Onboarding] Skipping signup — missing fields, navigating to app');
        return 'skip';
      }
      if (password.length < 6) throw new Error('Password must be at least 6 characters');
      return signUp(trimmedEmail, password, trimmedName, selectedSign || 'Aries', birthDate || '2000-01-01');
    },
    onSuccess: (result) => {
      if (result === 'skip') {
        console.log('[Onboarding] Skipped, navigating to login');
        router.replace('/(auth)/login');
        return;
      }
      console.log('[Onboarding] Complete, navigating to app');
      router.replace('/(app)/(home)');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const renderStep0 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepIcon}>
        <Star size={32} color={Colors.purpleLight} />
      </View>
      <Text style={styles.stepTitle}>Who are you?</Text>
      <Text style={styles.stepDesc}>Let's start with the basics</Text>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textMuted} value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <TextInput style={styles.input} placeholder="Password (min 6 characters)" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
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
      <View style={styles.stepIcon}>
        <Calendar size={32} color={Colors.purpleLight} />
      </View>
      <Text style={styles.stepTitle}>When were you born?</Text>
      <Text style={styles.stepDesc}>We'll calculate your natal chart</Text>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="Birth date (YYYY-MM-DD)" placeholderTextColor={Colors.textMuted} value={birthDate} onChangeText={setBirthDate} />
        <View style={styles.inputRow}>
          <MapPin size={18} color={Colors.textMuted} />
          <TextInput style={[styles.input, styles.inputRowInput]} placeholder="Birth city (optional)" placeholderTextColor={Colors.textMuted} value={birthCity} onChangeText={setBirthCity} />
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
        {ZODIAC_SIGNS.map((sign) => (
          <Pressable
            key={sign.name}
            style={[styles.signCard, selectedSign === sign.name && styles.signCardSelected]}
            onPress={() => setSelectedSign(sign.name)}
          >
            <Text style={styles.signSymbol}>{sign.symbol}</Text>
            <Text style={[styles.signName, selectedSign === sign.name && styles.signNameSelected]}>{sign.name}</Text>
          </Pressable>
        ))}
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
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.progressRow}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
            ))}
            <Pressable onPress={() => { if (step < 2) { animateStep(step + 1); } else { completeMutation.mutate(); } }} style={styles.skipBtn}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </Pressable>
          </View>
          <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
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
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  progressDot: { width: 32, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  progressDotActive: { backgroundColor: Colors.purple },
  skipBtn: { position: 'absolute' as const, right: 24, top: 12 },
  skipBtnText: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600' as const },
  stepContent: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  stepIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.purpleDim, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  stepTitle: { fontSize: 28, fontWeight: '800' as const, color: Colors.textPrimary, marginBottom: 8 },
  stepDesc: { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },
  form: { gap: 16, marginBottom: 32 },
  input: {
    backgroundColor: Colors.bgInput,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
    paddingHorizontal: 16,
    height: 56,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: 14, borderWidth: 1, borderColor: Colors.bgInputBorder, paddingHorizontal: 16, height: 56, gap: 10 },
  inputRowInput: { flex: 1, borderWidth: 0, paddingHorizontal: 0, height: 'auto' as unknown as number },
  nextBtn: { borderRadius: 16, overflow: 'hidden' },
  nextBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700' as const, color: '#fff' },
  btnPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  signGrid: { flex: 1, marginBottom: 16 },
  signGridContent: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
  signCard: {
    width: '30%' as unknown as number,
    aspectRatio: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.bgCardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  signCardSelected: { borderColor: Colors.purple, backgroundColor: Colors.purpleDim },
  signSymbol: { fontSize: 28 },
  signName: { fontSize: 12, fontWeight: '600' as const, color: Colors.textSecondary },
  signNameSelected: { color: Colors.purpleLight },
});
