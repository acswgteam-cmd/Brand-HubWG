import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const isPlaceholder = (val?: string) => !val || val.includes('placeholder') || val === '';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = !isPlaceholder(process.env.SUPABASE_URL) && !isPlaceholder(process.env.SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
