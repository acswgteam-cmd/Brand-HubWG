import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * Utility to safely get environment variables from different possible sources
 * (process.env for standard Node-like envs, import.meta.env for Vite-like envs)
 */
const getEnv = (key: string): string => {
  try {
    // @ts-ignore
    const env = (typeof process !== 'undefined' && process.env) ? process.env : {};
    // @ts-ignore
    const meta = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
    
    return (env[key] || meta[key] || (window as any)[key] || '').trim();
  } catch (e) {
    return '';
  }
};

const rawUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
const rawKey = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');

// Clean the URL (remove trailing slashes)
const supabaseUrl = rawUrl.replace(/\/$/, "");
const supabaseAnonKey = rawKey;

// Improved configuration check
export const isSupabaseConfigured = supabaseUrl.length > 10 && supabaseAnonKey.length > 10;

// Validate URL format
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const configError = !isSupabaseConfigured 
  ? "Missing Supabase configuration. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment variables." 
  : (!isValidUrl(supabaseUrl) ? `Malformed Supabase URL: "${supabaseUrl}". It must start with https://` : null);

// Initialize client with fallback
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
