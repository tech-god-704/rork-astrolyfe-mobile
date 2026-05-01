import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';

const ADMIN_UUID = '48355a3b-3a15-414b-9bf4-f344e98a7c19';

export interface QuizData {
  birth_year?: number;
  birth_month?: number;
  birth_day?: number;
  birth_hour?: number;
  birth_minute?: number;
  birth_place?: string;
  country_code?: string;
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
  quiz_data: QuizData | null;
  // Subscription fields (synced by Stripe webhook → profiles table)
  subscription_status: string | null;
  subscription_product: string | null;
  subscription_period_end: string | null;
  trial_end_date: string | null;
  is_admin: boolean;
}

const ACTIVE_STATUSES = ['active', 'trialing', 'trial', 'lifetime'];

const ADMIN_TEST_PROFILE: UserProfile = {
  email: 'admin@astrolyfe.app',
  display_name: 'AstroLyfe Admin',
  zodiac_sign: 'Cancer',
  birth_date: '1990-07-15',
  birth_city: 'Los Angeles, CA',
  birth_lat: 34.0522,
  birth_lon: -118.2437,
  quiz_data: {
    birth_year: 1990,
    birth_month: 7,
    birth_day: 15,
    birth_hour: 14,
    birth_minute: 30,
    birth_place: 'Los Angeles, CA',
    country_code: 'US',
  },
  subscription_status: 'lifetime',
  subscription_product: null,
  subscription_period_end: null,
  trial_end_date: null,
  is_admin: true,
};

function checkIsAdmin(session: Session | null, profile: UserProfile | null): boolean {
  if (profile?.is_admin) return true;
  if (!session?.user) return false;
  return (
    session.user.id === ADMIN_UUID ||
    session.user.app_metadata?.role === 'admin' ||
    session.user.user_metadata?.role === 'admin'
  );
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

  const isAdmin = useMemo(() => skipAuth || checkIsAdmin(session, profile), [skipAuth, session, profile]);

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
        .select('email, display_name, zodiac_sign, date_of_birth, birth_city, birth_lat, birth_lon, quiz_data, subscription_status, subscription_product, subscription_period_end, trial_end_date, is_admin')
        .eq('email', email)
        .single()
        .abortSignal(controller.signal);

      if (version !== fetchVersion.current) return null;

      if (profileData) {
        return {
          email: profileData.email,
          display_name: profileData.display_name,
          zodiac_sign: profileData.zodiac_sign,
          birth_date: profileData.date_of_birth,
          birth_city: profileData.birth_city,
          birth_lat: profileData.birth_lat,
          birth_lon: profileData.birth_lon,
          quiz_data: profileData.quiz_data,
          subscription_status: profileData.subscription_status,
          subscription_product: profileData.subscription_product,
          subscription_period_end: profileData.subscription_period_end,
          trial_end_date: profileData.trial_end_date,
          is_admin: profileData.is_admin ?? false,
        };
      }

      // Fallback: try users table (web quiz writes here before auth signup)
      if (profileError) {
        console.log('[Auth] No profiles row, falling back to users table');
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, display_name, zodiac_sign, birth_date, birth_city, birth_lat, birth_lon, quiz_data, subscription_status')
          .eq('email', email)
          .single()
          .abortSignal(controller.signal);

        if (version !== fetchVersion.current) return null;
        if (userError || !userData) return null;

        return {
          email: userData.email,
          display_name: userData.display_name ?? null,
          zodiac_sign: userData.zodiac_sign ?? null,
          birth_date: userData.birth_date ?? null,
          birth_city: userData.birth_city ?? null,
          birth_lat: userData.birth_lat ?? null,
          birth_lon: userData.birth_lon ?? null,
          quiz_data: userData.quiz_data ?? null,
          subscription_status: userData.subscription_status ?? 'free',
          subscription_product: null,
          subscription_period_end: null,
          trial_end_date: null,
          is_admin: false,
        };
      }

      return null;
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
      setProfile(ADMIN_TEST_PROFILE);
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

  const signUp = useCallback(async (email: string, password: string, displayName: string, zodiacSign: string, birthDate: string) => {
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
    }).eq('email', email);

    if (updateError) {
      // Trigger may not have fired yet — retry once after delay
      console.log('[Auth] Profile update failed, retrying...', updateError.message);
      await new Promise((r) => setTimeout(r, 1000));
      const { error: retryError } = await supabase.from('profiles').update({
        display_name: displayName,
        zodiac_sign: zodiacSign || null,
        date_of_birth: birthDate || null,
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
    if (isAdmin) return true;
    const status = profile?.subscription_status;
    return status ? ACTIVE_STATUSES.includes(status) : false;
  }, [profile, isAdmin]);

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
