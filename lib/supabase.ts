import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://pqafzkanarjmfrljjzil.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxYWZ6a2FuYXJqbWZybGpqemlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1OTE3ODksImV4cCI6MjA5MzE2Nzc4OX0.e265P0hrCHj3eL5gYcGpbTK2U4BYrqhX-SwxQ_-Ku8Q';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
