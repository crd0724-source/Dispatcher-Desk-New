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

let clientRef: any = null;
let refreshSessionPromise: Promise<string | null> | null = null;

/**
 * Transparently refreshes the user's session if expired.
 * Deduplicates in-flight refresh calls to avoid concurrency issues.
 */
const getRefreshedToken = async (): Promise<string | null> => {
  if (!clientRef) return null;
  if (!refreshSessionPromise) {
    refreshSessionPromise = (async () => {
      try {
        const { data, error } = await clientRef.auth.refreshSession();
        if (!error && data?.session?.access_token) {
          return data.session.access_token;
        }
        return null;
      } catch (err) {
        console.warn('[Supabase] Background token refresh warning:', err);
        return null;
      } finally {
        refreshSessionPromise = null;
      }
    })();
  }
  return refreshSessionPromise;
};

/**
 * Custom fetch wrapper for Supabase client:
 * Automatically catches PostgREST PGRST303 ("JWT expired") responses,
 * performs an authenticated session refresh, and transparently retries the query
 * with the fresh access token so operations like creating/updating brokers and loads
 * succeed uninterrupted even after idle periods.
 */
const customFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input || '');
  const isAuthTokenEndpoint = urlStr.includes('/auth/v1/token');

  const response = await fetch(input, init);

  // Check for expired JWT on non-auth requests
  if (response.status === 401 && !isAuthTokenEndpoint && clientRef) {
    try {
      const cloned = response.clone();
      const bodyText = await cloned.text();

      if (bodyText.includes('PGRST303') || bodyText.includes('JWT expired') || bodyText.includes('jwt expired')) {
        console.warn('[Supabase] Expired JWT detected (PGRST303). Refreshing session and retrying request...');
        const newToken = await getRefreshedToken();

        if (newToken) {
          const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : {}));
          headers.set('Authorization', `Bearer ${newToken}`);

          // Retry request with fresh access token
          return await fetch(input, {
            ...init,
            headers,
          });
        }
      }
    } catch (interceptorErr) {
      console.warn('[Supabase] Auth interceptor retry notice:', interceptorErr);
    }
  }

  return response;
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
    global: {
      fetch: customFetch,
    },
  }
);

clientRef = supabase;
