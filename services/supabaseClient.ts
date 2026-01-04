import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const isPlaceholder = (val?: string) => !val || val.includes('placeholder') || val === '' || val.length < 10;

// Support both standard names and VITE_ prefixed names from user screenshot
const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const rawKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

// Clean the URL (remove trailing slashes and spaces)
const supabaseUrl = rawUrl.trim().replace(/\/$/, "");
const supabaseAnonKey = rawKey.trim();

export const isSupabaseConfigured = !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);

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
  ? "Missing Supabase environment variables. Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set." 
  : (!isValidUrl(supabaseUrl) ? `Invalid Supabase URL format: "${supabaseUrl}". It must start with https://` : null);

// Initialize client
export const supabase = createClient(
  isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);
