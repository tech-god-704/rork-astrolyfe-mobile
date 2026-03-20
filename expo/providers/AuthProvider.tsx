import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';

const ADMIN_UUID = '48355a3b-3a15-414b-9bf4-f344e98a7c19';

export interface UserProfile {
  email: string;
  display_name: string | null;
  zodiac_sign: string | null;
  birth_date: string | null;
  birth_city: string | null;
  birth_lat: number | null;
  birth_lon: number | null;
}

// Default admin profile for PIN-bypass testing — gives the natal chart
// real data to calculate with (Cancer Sun, born in Los Angeles)
const ADMIN_TEST_PROFILE: UserProfile = {
  email: 'admin@astrolyfe.app',
  display_name: 'AstroLyfe Admin',
  zodiac_sign: 'Cancer',
  birth_date: '1990-07-15',
  birth_city: 'Los Angeles, CA',
  birth_lat: 34.0522,
  birth_lon: -118.2437,
};

function checkIsAdmin(session: Session | null): boolean {
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

  // Guard against concurrent profile fetches
  const fetchInFlight = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const isAdmin = useMemo(() => skipAuth || checkIsAdmin(session), [skipAuth, session]);

  const fetchProfile = useCallback(async (email: string): Promise<UserProfile | null> => {
    if (fetchInFlight.current) return null;
    fetchInFlight.current = true;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email, display_name, zodiac_sign, birth_date, birth_city, birth_lat, birth_lon')
        .eq('email', email)
        .single();
      if (error) {
        console.log('[Auth] Profile fetch error:', error.message);
        return null;
      }
      return data as UserProfile;
    } catch (e) {
      console.log('[Auth] Profile fetch exception:', e);
      return null;
    } finally {
      fetchInFlight.current = false;
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

  // Load admin test profile when PIN bypass is activated
  useEffect(() => {
    if (skipAuth && !profile) {
      setProfile(ADMIN_TEST_PROFILE);
      setIsLoading(false);
      setIsReady(true);
    }
  }, [skipAuth, profile]);

  // Refresh session when app returns from background
  useEffect(() => {
    const handleAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string, zodiacSign: string, birthDate: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Create user profile row — this MUST succeed for the app to work
    const { error: insertError } = await supabase.from('users').insert({
      email,
      display_name: displayName,
      zodiac_sign: zodiacSign || null,
      birth_date: birthDate || null,
    });

    if (insertError) {
      // If it's a unique constraint error, the user might already exist — try upsert
      if (insertError.code === '23505') {
        console.log('[Auth] User row already exists, updating instead');
        await supabase.from('users').update({
          display_name: displayName,
          zodiac_sign: zodiacSign || null,
          birth_date: birthDate || null,
        }).eq('email', email);
      } else {
        console.error('[Auth] Failed to create user profile:', insertError.message);
        throw new Error('Account created but profile setup failed. Please sign in and update your profile.');
      }
    }
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Ensure user row exists (edge case: auth exists but users row doesn't)
    const { data: existing } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (!existing) {
      console.log('[Auth] Creating missing user row on sign-in');
      await supabase.from('users').insert({
        email,
        display_name: email.split('@')[0],
      });
    }

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

  return useMemo(() => ({
    session,
    user,
    profile,
    isLoading,
    isReady,
    isAuthenticated: !!session || skipAuth,
    isAdmin,
    skipAuth,
    setSkipAuth,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }), [session, user, profile, isLoading, isReady, skipAuth, isAdmin, signUp, signIn, signOut, refreshProfile]);
});
