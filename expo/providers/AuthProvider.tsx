import { useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  email: string;
  display_name: string | null;
  zodiac_sign: string | null;
  birth_date: string | null;
}

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [skipAuth, setSkipAuth] = useState<boolean>(false);

  const fetchProfile = useCallback(async (email: string) => {
    try {
      console.log('[Auth] Fetching profile for:', email);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      if (error) {
        console.log('[Auth] Profile fetch error:', error.message);
        return null;
      }
      console.log('[Auth] Profile fetched:', data);
      return data as UserProfile;
    } catch (e) {
      console.log('[Auth] Profile fetch exception:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[Auth] Initializing session...');
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Session check timed out')), 8000)
        );
        const { data: { session: existing } } = await Promise.race([sessionPromise, timeoutPromise]);
        console.log('[Auth] Existing session:', existing ? 'found' : 'none');
        setSession(existing);
        setUser(existing?.user ?? null);
        if (existing?.user?.email) {
          const p = await fetchProfile(existing.user.email);
          setProfile(p);
        }
      } catch (e) {
        console.log('[Auth] Init error:', e);
      } finally {
        setIsLoading(false);
        setIsReady(true);
      }
    };
    void init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      console.log('[Auth] Auth state changed:', _event);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user?.email) {
        const p = await fetchProfile(newSession.user.email);
        setProfile(p);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName: string, zodiacSign: string, birthDate: string) => {
    console.log('[Auth] Signing up:', email);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const { error: insertError } = await supabase.from('users').insert({
      email,
      display_name: displayName,
      zodiac_sign: zodiacSign,
      birth_date: birthDate,
    });
    if (insertError) {
      console.log('[Auth] Insert user row error:', insertError.message);
    }
    return data;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Signing in:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    console.log('[Auth] Signing out');
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.email) {
      const p = await fetchProfile(user.email);
      setProfile(p);
    }
  }, [user, fetchProfile]);

  return useMemo(() => ({
    session,
    user,
    profile,
    isLoading,
    isReady,
    isAuthenticated: !!session || skipAuth,
    skipAuth,
    setSkipAuth,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }), [session, user, profile, isLoading, isReady, skipAuth, signUp, signIn, signOut, refreshProfile]);
});
