import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, Camera, Sparkles, Compass, Heart, Sun } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { Fonts } from '@/constants/theme';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, uploadFile } from '@/lib/supabase';
import CosmicBackground from '@/components/CosmicBackground';
import BrandMark from '@/components/BrandMark';
import { useThemedStyles } from '@/providers/ThemeProvider';
import { NOTIF_PROMPT_FLAG, onboardingDoneKey } from '@/constants/storageKeys';

/**
 * One-time welcome tour, shown between login and the tab bar for any account whose
 * onboarding_completed flag is not yet true — see the AuthGate in app/_layout.tsx.
 *
 * The column already existed on the profiles collection with nothing reading or
 * writing it, so every first login previously skipped straight to the home tab with
 * no introduction at all. This is a real gap for the common case: a customer who
 * created their password on the web checkout, not in the app, is logging into an
 * interface they have genuinely never seen before.
 *
 * Icons reuse the exact ones the tab bar uses for the same destinations (Compass for
 * Chart, Heart for Compatibility, Sun for Forecast) so the promise made here and the
 * icon the user later taps are the same shape, not a coincidentally similar one.
 */

interface Step {
  icons: (typeof Sparkles)[];
  eyebrow: string;
  title: string;
  copy: string;
}

// Icons match the exact ones the tab bar uses for the same destinations (Compass for
// Chart, Sun for Forecast, Heart for Match), so the promise made here and the icon a
// user later taps are the same shape, not a coincidentally similar one.
const STEPS: Step[] = [
  {
    icons: [Sparkles],
    eyebrow: "You're in",
    title: 'Welcome to AstroLyfe',
    copy: 'This is where your soulmate portrait and reading live, plus tools to explore your own chart any time.',
  },
  {
    icons: [Sparkles],
    eyebrow: 'Your reveal',
    title: 'Your reading arrives here',
    copy: "If you just purchased, your portrait and five-part reading are being prepared and will appear on Insights the moment they're ready — you'll also get an email.",
  },
  {
    icons: [Compass, Sun, Heart],
    eyebrow: 'Explore',
    title: 'Chart, Forecast & Match',
    copy: 'Your birth chart, a daily forecast built from your own transits, and compatibility with anyone you have in mind.',
  },
  {
    icons: [Sparkles],
    eyebrow: "Let's go",
    title: 'Everything is ready',
    copy: 'Explore at your own pace. You can always find your reading again from the Insights tab.',
  },
];

export default function WelcomeTourScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { profile, user, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const fade = useRef(new Animated.Value(1)).current;

  // The web funnel never asks for a name, so most accounts land here with a null
  // display_name. A native in-app signup already collects one, so only show this step
  // when there is genuinely nothing on file yet — locked at mount so a background
  // refreshProfile() mid-flow can't yank the step out from under the customer.
  const [showProfileStep] = useState(() => !profile?.display_name?.trim());
  const [profileStepDone, setProfileStepDone] = useState(false);
  const [name, setName] = useState(profile?.display_name ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const pickedAsset = useRef<ImagePicker.ImagePickerAsset | null>(null);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo access needed', 'Enable photo library access in Settings to add a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]) return;
    pickedAsset.current = result.assets[0];
    setAvatarUri(result.assets[0].uri);
    setAvatarError(null);
  }, []);

  const continueFromProfileStep = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || savingProfile) return;
    setSavingProfile(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      // Upsert rather than update: a funnel customer's profiles row may not exist yet
      // at this point, and this is the one place in the app that needs to be able to
      // create it rather than assume it. user_id only matters for that insert branch —
      // it's the required relation the profiles schema enforces.
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ email: profile?.email, user_id: user?.id, display_name: trimmed }, { onConflict: 'email' });
      if (error) throw error;

      const recordId = (data as { id?: string } | null)?.id ?? profile?.id ?? null;
      if (pickedAsset.current && recordId) {
        const asset = pickedAsset.current;
        setAvatarUploading(true);
        try {
          await uploadFile('profiles', recordId, 'avatar', {
            uri: asset.uri,
            name: asset.fileName || `avatar-${recordId}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          });
        } catch {
          setAvatarError("Couldn't upload that photo — you can add one later from your profile.");
        } finally {
          setAvatarUploading(false);
        }
      }
      await refreshProfile();
    } catch {
      // Same reasoning as finish() below — never trap someone here because a single
      // write failed. Worst case their name doesn't stick and they can set it from the
      // Profile tab instead.
    } finally {
      setSavingProfile(false);
      setProfileStepDone(true);
    }
  }, [name, savingProfile, profile?.email, profile?.id, user?.id, refreshProfile]);

  const animateTo = useCallback((next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
    setStep(next);
  }, [fade]);

  const finish = useCallback(async () => {
    if (finishing) return;
    setFinishing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      if (profile?.email) {
        // Mirrors the update pattern already used in the Profile tab: filter by email,
        // since PocketBase updates by record id and the adapter resolves that lookup.
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('email', profile.email);
        if (error) throw error;
        await refreshProfile();
      }
    } catch {
      // Never trap someone on the tour because a single write failed. Set unconditionally
      // below regardless of this failure — see onboardingDoneKey's doc comment for why
      // that, not this catch alone, is what actually prevents a same-session bounce loop.
    } finally {
      if (profile?.email) {
        // AuthGate falls back to this if the write above failed: without it, a failed
        // write left profile.onboarding_completed stale, and AuthGate would redirect
        // straight back here the instant navigation below lands on Home — not "next
        // login," an immediate loop in the same session.
        await AsyncStorage.setItem(onboardingDoneKey(profile.email), '1').catch(() => {});
      }
      // Consumed by Home on its next mount to show the one-time notification
      // pre-permission prompt. AsyncStorage rather than a query param: Home already
      // has no route-param handling and this only ever needs to fire once per device.
      await AsyncStorage.setItem(NOTIF_PROMPT_FLAG, '1').catch(() => {});
      router.replace('/(app)/(home)');
    }
  }, [finishing, profile?.email, refreshProfile, router]);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  if (showProfileStep && !profileStepDone) {
    return (
      <CosmicBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.top}>
            <BrandMark size={40} />
          </View>

          <View style={styles.content}>
            <Pressable
              onPress={pickPhoto}
              disabled={avatarUploading}
              style={styles.avatarPicker}
              accessibilityRole="button"
              accessibilityLabel={avatarUri ? 'Change profile picture' : 'Add a profile picture'}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Camera size={26} color={Colors.lavender} strokeWidth={1.8} />
                </View>
              )}
              {avatarUploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color={Colors.paperInk} />
                </View>
              )}
            </Pressable>
            <Text style={styles.avatarCaption}>{avatarUri ? 'Tap to change' : 'Add a photo — optional'}</Text>

            <Text style={styles.eyebrow}>Let's set up your profile</Text>
            <Text style={styles.title}>What should we call you?</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Your first name"
              placeholderTextColor={Colors.textFaint}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              maxLength={60}
              onSubmitEditing={continueFromProfileStep}
            />
            {avatarError ? <Text style={styles.profileStepError}>{avatarError}</Text> : null}
          </View>

          <View style={styles.bottom}>
            <Pressable
              onPress={continueFromProfileStep}
              disabled={!name.trim() || savingProfile}
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.ctaPressed,
                (!name.trim() || savingProfile) && styles.ctaDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              {savingProfile ? (
                <ActivityIndicator color={Colors.black} />
              ) : (
                <>
                  <Text style={styles.ctaText}>Continue</Text>
                  <ArrowRight size={18} color={Colors.black} strokeWidth={2.4} />
                </>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </CosmicBackground>
    );
  }

  return (
    <CosmicBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.top}>
          <BrandMark size={40} />
          <Pressable
            onPress={finish}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip introduction"
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <Animated.View style={[styles.content, { opacity: fade }]}>
          <View style={styles.iconRow}>
            {current.icons.map((FeatureIcon, i) => {
              const ringSize = current.icons.length > 1 ? 56 : 76;
              return (
                <View key={i} style={[styles.iconRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2 }]}>
                  <FeatureIcon size={current.icons.length > 1 ? 22 : 30} color={Colors.lavender} strokeWidth={1.8} />
                </View>
              );
            })}
          </View>
          <Text style={styles.eyebrow}>{current.eyebrow}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.copy}>{current.copy}</Text>
        </Animated.View>

        <View style={styles.bottom}>
          <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
            ))}
          </View>

          <Pressable
            onPress={isLast ? finish : () => animateTo(step + 1)}
            disabled={finishing}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed, finishing && styles.ctaDisabled]}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Enter AstroLyfe' : 'Next'}
          >
            <Text style={styles.ctaText}>{isLast ? 'Enter AstroLyfe' : 'Next'}</Text>
            <ArrowRight size={18} color={Colors.black} strokeWidth={2.4} />
          </Pressable>
        </View>
      </SafeAreaView>
    </CosmicBackground>
  );
}

const createStyles = () => StyleSheet.create({
  safeArea: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  skip: {
    fontFamily: Fonts.body,
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(218,200,242,0.62)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 26,
  },
  iconRing: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150,98,198,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.4)',
  },
  eyebrow: {
    fontFamily: Fonts.body,
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 1.4,
    textTransform: 'uppercase' as const,
    color: Colors.lavender,
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.paperInk,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 34,
  },
  copy: {
    fontFamily: Fonts.body,
    fontSize: 15.5,
    lineHeight: 23,
    color: 'rgba(218,200,242,0.82)',
    textAlign: 'center',
    maxWidth: 320,
  },
  avatarPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(150,98,198,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(192,154,235,0.4)',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(1,1,2,0.45)',
  },
  avatarCaption: {
    fontFamily: Fonts.body,
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(218,200,242,0.62)',
    marginBottom: 26,
  },
  nameInput: {
    width: '100%',
    maxWidth: 320,
    minHeight: 56,
    borderRadius: 16,
    paddingHorizontal: 20,
    marginTop: 8,
    backgroundColor: Colors.bgInput,
    borderWidth: 1,
    borderColor: Colors.bgInputBorder,
    fontFamily: Fonts.body,
    fontSize: 17,
    color: Colors.paperInk,
    textAlign: 'center',
  },
  profileStepError: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.danger,
    textAlign: 'center',
    marginTop: 14,
    maxWidth: 300,
  },
  bottom: { paddingBottom: 20, gap: 22 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(218,200,242,0.22)',
  },
  dotActive: {
    width: 20,
    backgroundColor: Colors.lavender,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: Colors.lavender,
  },
  ctaPressed: { opacity: 0.88 },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontFamily: Fonts.body,
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.black,
  },
});
