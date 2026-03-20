import { useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import createContextHook from '@nkzw/create-context-hook';
import { supabase } from '@/lib/supabase';

const ADMIN_UUID = '48355a3b-3a15-414b-9bf4-f344e98a7c19';

export interface UserProfile {
  email: string;
  display_name: string | null;
  zodiac_sign: string | null;
  birth_date: string | null;
}

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

  const isAdmin = useMemo(() => checkIsAdmin(session), [session]);

  const fetchProfile = useCallback(async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    const { error: insertError } = await supabase.from('users').insert({
      email,
      display_name: displayName,
      zodiac_sign: zodiacSign || null,
      birth_date: birthDate || null,
    });
    if (insertError) {
      console.log('[Auth] Insert user row error:', insertError.message);
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
    isAdmin,
    skipAuth,
    setSkipAuth,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }), [session, user, profile, isLoading, isReady, skipAuth, isAdmin, signUp, signIn, signOut, refreshProfile]);
});
