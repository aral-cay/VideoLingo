import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These should be set as environment variables in production
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Environment variables should be set in .env file
// VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

