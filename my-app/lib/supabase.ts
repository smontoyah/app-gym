import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import type { Database } from '@/types/database';

const supabaseUrl = 'https://dpuccuthmcrolutpzicu.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwdWNjdXRobWNyb2x1dHB6aWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2ODAxNzQsImV4cCI6MjA5MTI1NjE3NH0.ks_5dsya_tsZDMGsJ5q4qADdKlQwtZlskfVhjwBC5dA';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Token refresh: start/stop when app goes foreground/background
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
