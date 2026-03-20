import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { Heart, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { ZODIAC_SIGNS, getZodiacByName } from '@/constants/zodiac';
import GlassCard from '@/components/GlassCard';
import { parseBirthDate, getWesternHoroscope, type BirthData } from '@/services/astrology';

interface CompatibilityResult {
  score: number;
  description: string;
  strengths: string[];
  challenges: string[];
}

export default function CompatibilityScreen() {
  const { profile } = useAuth();
  const userZodiac = profile?.zodiac_sign ? getZodiacByName(profile.zodiac_sign) : null;

  const [partnerSign, setPartnerSign] = useState<string>('');
  const [partnerBirthDate, setPartnerBirthDate] = useState<string>('');
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  const compatMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.zodiac_sign || !partnerSign) {
        throw new Error('Please select both zodiac signs');
      }

      // Try API call if birth dates are available
      if (profile.birth_date && partnerBirthDate) {
        const parsed1 = parseBirthDate(profile.birth_date);
        const parsed2 = parseBirthDate(partnerBirthDate);
        if (parsed1 && parsed2) {
          const data1: BirthData = { ...parsed1, hour: 12, min: 0, lat: 40.7128, lon: -74.006, tzone: -5 };
          const data2: BirthData = { ...parsed2, hour: 12, min: 0, lat: 40.7128, lon: -74.006, tzone: -5 };
          try {
            const apiResult = await getWesternHoroscope(data1, data2);
            // Parse API result into our format
            if (apiResult && typeof apiResult === 'object') {
              return {
                score: typeof apiResult.score === 'number' ? apiResult.score : calculateZodiacScore(profile.zodiac_sign, partnerSign),
                description: typeof apiResult.description === 'string' ? apiResult.description : getZodiacDescription(profile.zodiac_sign, partnerSign),
                strengths: Array.isArray(apiResult.strengths) ? apiResult.strengths as string[] : getStrengths(profile.zodiac_sign, partnerSign),
                challenges: Array.isArray(apiResult.challenges) ? apiResult.challenges as string[] : getChallenges(profile.zodiac_sign, partnerSign),
              } as CompatibilityResult;
            }
          } catch (e) {
            console.log('[Compatibility] API error, falling back to local:', e);
          }
        }
      }

      // Fallback to local zodiac-based calculation
      return {
        score: calculateZodiacScore(profile.zodiac_sign, partnerSign),
        description: getZodiacDescription(profile.zodiac_sign, partnerSign),
        strengths: getStrengths(profile.zodiac_sign, partnerSign),
        challenges: getChallenges(profile.zodiac_sign, partnerSign),
      } as CompatibilityResult;
    },
    onSuccess: (data) => {
      setResult(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleCheck = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    compatMutation.mutate();
  }, [compatMutation]);

  const partnerZodiac = partnerSign ? getZodiacByName(partnerSign) : null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a103d', '#120d2e', '#0a0a1a']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Compatibility</Text>
          <Text style={styles.subtitle}>Discover your cosmic connection</Text>

          <GlassCard style={styles.yourSignCard}>
            <Text style={styles.fieldLabel}>Your Sign</Text>
            <View style={styles.signDisplay}>
              <Text style={styles.signDisplaySymbol}>{userZodiac?.symbol ?? '?'}</Text>
              <Text style={styles.signDisplayName}>{userZodiac?.name ?? 'Set in profile'}</Text>
            </View>
          </GlassCard>

          <GlassCard style={styles.partnerCard}>
            <Text style={styles.fieldLabel}>Partner's Sign</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.signScroll} contentContainerStyle={styles.signScrollContent}>
              {ZODIAC_SIGNS.map((sign) => (
                <Pressable
                  key={sign.name}
                  style={[styles.signChip, partnerSign === sign.name && styles.signChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setPartnerSign(sign.name);
                  }}
                >
                  <Text style={styles.signChipSymbol}>{sign.symbol}</Text>
                  <Text style={[styles.signChipLabel, partnerSign === sign.name && styles.signChipLabelActive]}>{sign.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Partner's Birth Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={partnerBirthDate}
              onChangeText={setPartnerBirthDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </GlassCard>

          <Pressable
            style={({ pressed }) => [styles.checkBtn, pressed && { opacity: 0.8 }]}
            onPress={handleCheck}
            disabled={!partnerSign || !profile?.zodiac_sign || compatMutation.isPending}
          >
            <LinearGradient colors={[Colors.accent, '#E11D48']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.checkBtnInner}>
              {compatMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Heart size={20} color="#fff" />
                  <Text style={styles.checkBtnText}>Check Compatibility</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {result && (
            <View style={styles.resultSection}>
              <GlassCard style={styles.scoreCard}>
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreEmoji}>{userZodiac?.symbol ?? '?'}</Text>
                  <View style={styles.scoreCenter}>
                    <Text style={styles.scoreValue}>{result.score}%</Text>
                    <Text style={styles.scoreLabel}>Match Score</Text>
                  </View>
                  <Text style={styles.scoreEmoji}>{partnerZodiac?.symbol ?? '?'}</Text>
                </View>
                <View style={styles.scoreBar}>
                  <View style={[styles.scoreBarFill, { width: `${result.score}%` }]} />
                </View>
              </GlassCard>

              <GlassCard style={styles.descCard}>
                <Sparkles size={18} color={Colors.gold} />
                <Text style={styles.descText}>{result.description}</Text>
              </GlassCard>

              {result.strengths.length > 0 && (
                <GlassCard style={styles.listCard}>
                  <Text style={styles.listTitle}>Strengths</Text>
                  {result.strengths.map((s, i) => (
                    <Text key={i} style={styles.listItem}>+ {s}</Text>
                  ))}
                </GlassCard>
              )}

              {result.challenges.length > 0 && (
                <GlassCard style={styles.listCard}>
                  <Text style={[styles.listTitle, { color: Colors.accent }]}>Challenges</Text>
                  {result.challenges.map((c, i) => (
                    <Text key={i} style={styles.listItem}>- {c}</Text>
                  ))}
                </GlassCard>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Local zodiac compatibility logic as fallback
function getElementOf(sign: string): string {
  const z = getZodiacByName(sign);
  return z?.element ?? 'Unknown';
}

function calculateZodiacScore(sign1: string, sign2: string): number {
  const el1 = getElementOf(sign1);
  const el2 = getElementOf(sign2);
  if (el1 === el2) return 85 + Math.floor(Math.random() * 10);
  const compat: Record<string, string[]> = {
    Fire: ['Air'],
    Air: ['Fire'],
    Earth: ['Water'],
    Water: ['Earth'],
  };
  if (compat[el1]?.includes(el2)) return 70 + Math.floor(Math.random() * 15);
  return 45 + Math.floor(Math.random() * 20);
}

function getZodiacDescription(sign1: string, sign2: string): string {
  const el1 = getElementOf(sign1);
  const el2 = getElementOf(sign2);
  if (el1 === el2) return `${sign1} and ${sign2} share the ${el1} element, creating a natural understanding and deep resonance between you. Your energies align beautifully.`;
  return `${sign1} (${el1}) and ${sign2} (${el2}) bring different energies together. This pairing offers opportunities for growth through balancing each other's strengths.`;
}

function getStrengths(sign1: string, sign2: string): string[] {
  const el1 = getElementOf(sign1);
  const el2 = getElementOf(sign2);
  if (el1 === el2) return ['Natural understanding', 'Shared values', 'Easy communication', 'Mutual respect'];
  return ['Complementary strengths', 'Growth opportunities', 'Balance of energies'];
}

function getChallenges(sign1: string, sign2: string): string[] {
  const el1 = getElementOf(sign1);
  const el2 = getElementOf(sign2);
  if (el1 === el2) return ['May lack variety', 'Similar blind spots'];
  return ['Different communication styles', 'Need for compromise', 'Patience required'];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginTop: 4, marginBottom: 24 },
  yourSignCard: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  signDisplay: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  signDisplaySymbol: { fontSize: 32 },
  signDisplayName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  partnerCard: { marginBottom: 24 },
  signScroll: { marginBottom: 4 },
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
  signChipActive: { backgroundColor: 'rgba(244,114,182,0.15)', borderColor: Colors.accent },
  signChipSymbol: { fontSize: 16 },
  signChipLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  signChipLabelActive: { color: Colors.accent },
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
  checkBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 24 },
  checkBtnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  checkBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  resultSection: { gap: 16 },
  scoreCard: { alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 16 },
  scoreEmoji: { fontSize: 36 },
  scoreCenter: { alignItems: 'center' },
  scoreValue: { fontSize: 42, fontWeight: '800', color: Colors.accent },
  scoreLabel: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  scoreBar: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4 },
  scoreBarFill: { height: 8, borderRadius: 4, backgroundColor: Colors.accent },
  descCard: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  descText: { flex: 1, fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  listCard: { gap: 8 },
  listTitle: { fontSize: 15, fontWeight: '700', color: Colors.success },
  listItem: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
