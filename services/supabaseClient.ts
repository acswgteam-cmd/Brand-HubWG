import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const isPlaceholder = (val?: string) => !val || val.includes('placeholder') || val === '' || val.length < 10;

const rawUrl = process.env.SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_ANON_KEY || '';

// Clean the URL (remove trailing slashes)
const supabaseUrl = rawUrl.trim().replace(/\/$/, "");
const supabaseAnonKey = rawKey.trim();

export const isSupabaseConfigured = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

// Validate URL format to prevent "Failed to fetch" due to malformed URL
const isValidUrl = (url: string) => {
  try {
    new URL(url);
    return url.startsWith('https://');
  } catch {
    return false;
  }
};

export const configError = !isSupabaseConfigured 
  ? "Missing Supabase environment variables." 
  : (!isValidUrl(supabaseUrl) ? "Invalid Supabase URL format. It must start with https://" : null);

// Initialize client with fallback to prevent crash, 
// but we check isSupabaseConfigured in the UI
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
