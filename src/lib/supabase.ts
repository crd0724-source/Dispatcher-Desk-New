import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types.ts';

const getEnvVar = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  const globalProc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
  return globalProc?.env?.[key] || '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://ombipqikqaawcbnhrhuy.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'sb_publishable_GupZ7BNKNunw__ykakt9Aw_WbI_Uvhp';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project')
);

// Resolve Supabase endpoint:
// In browser environments (inside preview iframes or cross-domain contexts), route through
// the same-origin server proxy `/api/supabase` to completely avoid CORS preflight failures,
// third-party cookie restrictions, and "TypeError: Failed to fetch" errors.
// In SSR/Node environments, resolve directly to the configured endpoint.
const resolveSupabaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api/supabase`;
  }
  if (supabaseUrl && !supabaseUrl.includes('your-project')) {
    return supabaseUrl;
  }
  return 'https://ombipqikqaawcbnhrhuy.supabase.co';
};

// Type-safe Supabase client initialized with anon public key
export const supabase = createClient<Database>(
  resolveSupabaseUrl(),
  supabaseAnonKey || 'sb_publishable_GupZ7BNKNunw__ykakt9Aw_WbI_Uvhp',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
