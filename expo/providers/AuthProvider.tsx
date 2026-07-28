import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
// Types come from the backend client rather than supabase-js: the app now talks to
// PocketBase through a compatible shim, and supabase-js is no longer the source of
// truth for what a session or a user is.
import type { PbSession as Session, PbUser as User } from '@/lib/supabase';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';
import { normalizeBirthDate } from '@/lib/validation';
import { syncDailyReminder } from '@/services/notifications';

export interface QuizData {
  birth_year?: number;
  birth_month?: number;
  birth_day?: number;
  birth_hour?: number;
  birth_minute?: number;
  birth_place?: string;
  country_code?: string;
  /** Written by the web funnel as MM/DD/YYYY — normalize before use. */
  birth_date?: string;
  [key: string]: unknown;
}

export interface UserProfile {
  email: string;
  display_name: string | null;
  zodiac_sign: string | null;
  birth_date: string | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lon: number | null;
  /**
   * IANA zone of the birthplace. Required to convert a birth-time wall clock reading
   * into UT; without it the horoscope engine cannot trust the ascendant and drops to
   * its birth-date tier.
   */
  timezone: string | null;
  quiz_data: QuizData | null;
  /**
   * True once this account has seen the post-login welcome tour. The column already
   * existed on the profiles collection with nothing reading or writing it, so every
   * first login silently skipped straight to the tab bar with no introduction.
   */
  onboarding_completed: boolean;
  notifications_enabled: boolean;
  notification_hour: number;
  notification_minute: number;
  // Subscription fields (synced by Stripe webhook → profiles table)
  subscription_status: string | null;
  subscription_product: string | null;
  subscription_period_end: string | null;
  trial_end_date: string | null;
  is_admin: boolean;
}

const ACTIVE_STATUSES = ['active', 'trialing', 'trial', 'lifetime'];

const GUEST_PREVIEW_PROFILE: UserProfile = {
  email: '',
  display_name: 'Guest Explorer',
  zodiac_sign: 'Cancer',
  birth_date: '1990-07-15',
  birth_city: 'Los Angeles, CA',
  birth_lat: 34.0522,
  birth_lon: -118.2437,
  timezone: 'America/Los_Angeles',
  // A preview session, not a real onboarding candidate — never show the tour for it.
  onboarding_completed: true,
  notifications_enabled: false,
  notification_hour: 8,
  notification_minute: 0,
  quiz_data: {
    birth_year: 1990,
    birth_month: 7,
    birth_day: 15,
    birth_hour: 14,
    birth_minute: 30,
    birth_place: 'Los Angeles, CA',
    country_code: 'US',
  },
  subscription_status: 'free',
  subscription_product: null,
  subscription_period_end: null,
  trial_end_date: null,
  is_admin: false,
};

function checkIsAdmin(profile: UserProfile | null): boolean {
  // profiles.is_admin is the real mechanism, and the backend pins that field against
  // anything but a superuser write, so a user cannot grant it to themselves.
  return profile?.is_admin === true;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [skipAuth, setSkipAuth] = useState<boolean>(false);

  const fetchVersion = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const isAdmin = useMemo(() => checkIsAdmin(profile), [profile]);

  // Keep the OS-scheduled reminder in sync with the stored preference. Runs whenever
  // the resolved profile changes — covers a fresh install, a preference changed on
  // another device, and a normal toggle from the Profile screen alike, in one place
  // rather than re-implemented at every call site that can change the setting.
  // Guest preview has no real account and never enables notifications, so this is a
  // no-op for it.
  useEffect(() => {
    if (skipAuth || !profile) return;
    void syncDailyReminder(profile.notifications_enabled, profile.notification_hour, profile.notification_minute);
  }, [skipAuth, profile?.notifications_enabled, profile?.notification_hour, profile?.notification_minute]);

  /**
   * Fetch profile from PROFILES table (source of truth for mobile app).
   * Falls back to USERS table if profiles row doesn't exist yet
   * (e.g., user signed up on web but hasn't created auth account yet).
   */
  const fetchProfile = useCallback(async (email: string): Promise<UserProfile | null> => {
    const version = ++fetchVersion.current;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      // Try profiles table first (keyed by auth.users.id, has subscription data)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, display_name, zodiac_sign, date_of_birth, birth_city, birth_lat, birth_lon, timezone, quiz_data, onboarding_completed, notifications_enabled, notification_hour, notification_minute, subscription_status, subscription_product, subscription_period_end, trial_end_date, is_admin')
        .eq('email', email)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (version !== fetchVersion.current) return null;

      if (profileData) {
        return {
          email: profileData.email,
          display_name: profileData.display_name,
          zodiac_sign: profileData.zodiac_sign,
          birth_date: profileData.date_of_birth,
          birth_city: profileData.birth_city,
          timezone: profileData.timezone ?? null,
          birth_lat: profileData.birth_lat,
          birth_lon: profileData.birth_lon,
          quiz_data: profileData.quiz_data,
          onboarding_completed: profileData.onboarding_completed === true,
          notifications_enabled: profileData.notifications_enabled === true,
          notification_hour: typeof profileData.notification_hour === 'number' ? profileData.notification_hour : 8,
          notification_minute: typeof profileData.notification_minute === 'number' ? profileData.notification_minute : 0,
          subscription_status: profileData.subscription_status,
          subscription_product: profileData.subscription_product,
          subscription_period_end: profileData.subscription_period_end,
          trial_end_date: profileData.trial_end_date,
          is_admin: profileData.is_admin ?? false,
        };
      }

      // Fallback: the web quiz funnel writes public.users before auth signup, so a
      // customer who came through the funnel may have no profiles row yet.
      //
      // Only select columns that actually exist on public.users. display_name,
      // zodiac_sign, birth_city, birth_lat and birth_lon live on profiles only —
      // asking users for them fails the whole request with Postgres 42703.
      console.log('[Auth] No profiles row, falling back to users table');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email, birth_date, quiz_data, subscription_status')
        .eq('email', email)
        .abortSignal(controller.signal)
        .maybeSingle();

      if (version !== fetchVersion.current) return null;
      if (userError || !userData) return null;

      const quiz = userData.quiz_data as QuizData | null;

      return {
        email: userData.email,
        display_name: null,
        zodiac_sign: null,
        // The users table has no timezone column; this fallback path is for funnel leads
        // who have no profile row yet, so the horoscope stays on its birth-date tier.
        timezone: null,
        // No profiles row exists yet, so the tour has definitionally never been shown.
        onboarding_completed: false,
        // No profiles row yet, so no preference has ever been set.
        notifications_enabled: false,
        notification_hour: 8,
        notification_minute: 0,
        // The funnel stores the real birth date inside quiz_data as MM/DD/YYYY.
        birth_date: normalizeBirthDate(userData.birth_date) ?? normalizeBirthDate(quiz?.birth_date),
        birth_city: null,
        birth_lat: null,
        birth_lon: null,
        quiz_data: quiz,
        subscription_status: userData.subscription_status ?? 'free',
        subscription_product: null,
        subscription_period_end: null,
        trial_end_date: null,
        is_admin: false,
      };
    } catch (e) {
      console.log('[Auth] Profile fetch exception:', e);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session check timed out')), 8000)
        );
        const { data: { session: existing } } = await Promise.race([sessionPromise, timeoutPromise]);
        if (!isMounted.current) return;
        setSession(existing);
        setUser(existing?.user ?? null);
        // AppState only calls its listener after a transition; begin refresh on the
        // initial foregrounded launch as well.
        supabase.auth.startAutoRefresh();
        if (existing?.user?.email) {
          const p = await fetchProfile(existing.user.email);
          if (isMounted.current) setProfile(p);
        }
      } catch (e) {
        console.log('[Auth] Init error:', e);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
          setIsReady(true);
        }
      }
    };
    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted.current) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user?.email) {
        const p = await fetchProfile(newSession.user.email);
        if (isMounted.current) setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  useEffect(() => {
    if (skipAuth && !profile) {
      setProfile(GUEST_PREVIEW_PROFILE);
      setIsLoading(false);
      setIsReady(true);
    }
  }, [skipAuth, profile]);

  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        if (user?.email) {
          void fetchProfile(user.email).then((p) => {
            if (isMounted.current && p) setProfile(p);
          });
        }
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [user, fetchProfile]);

  const signUp = useCallback(async (
    email: string,
    password: string,
    displayName: string,
    zodiacSign: string,
    birthDate: string,
    birthCity = '',
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, full_name: displayName },
      },
    });
    if (error) throw error;

    // The profiles row is auto-created by the DB trigger.
    // Wait briefly for trigger to execute, then update with display info.
    await new Promise((r) => setTimeout(r, 500));

    const { error: updateError } = await supabase.from('profiles').update({
      display_name: displayName,
      zodiac_sign: zodiacSign || null,
      date_of_birth: birthDate || null,
      birth_city: birthCity || null,
    }).eq('email', email);

    if (updateError) {
      // Trigger may not have fired yet — retry once after delay
      console.log('[Auth] Profile update failed, retrying...', updateError.message);
      await new Promise((r) => setTimeout(r, 1000));
      const { error: retryError } = await supabase.from('profiles').update({
        display_name: displayName,
        zodiac_sign: zodiacSign || null,
        date_of_birth: birthDate || null,
        birth_city: birthCity || null,
      }).eq('email', email);
      if (retryError) {
        console.error('[Auth] Profile update retry failed:', retryError.message);
      }
    }

    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (isMounted.current) {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.email) {
      const p = await fetchProfile(user.email);
      if (isMounted.current) setProfile(p);
    }
  }, [user, fetchProfile]);

  const isSubscribed = useMemo(() => {
    // Guest exploration can navigate the product, but it is never an admin session
    // and remains unable to read or write protected PocketBase records.
    if (skipAuth) return true;
    if (isAdmin) return true;
    const status = profile?.subscription_status;
    return status ? ACTIVE_STATUSES.includes(status) : false;
  }, [profile, isAdmin, skipAuth]);

  return useMemo(() => ({
    session,
    user,
    profile,
    isLoading,
    isReady,
    isAuthenticated: !!session || skipAuth,
    isAdmin,
    isSubscribed,
    skipAuth,
    setSkipAuth,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }), [session, user, profile, isLoading, isReady, skipAuth, isAdmin, isSubscribed, signUp, signIn, signOut, refreshProfile]);
});
