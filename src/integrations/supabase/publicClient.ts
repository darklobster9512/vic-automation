// Sessionless Supabase client for public pages (e.g. /erster-arbeitstag/:id)
// Always uses the anon role, even if a user is logged in in the same browser.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Read from project env so a database switch never leaves public pages on a stale project.
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL || "https://dgkailowvrbugapykyan.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRna2FpbG93dnJidWdhcHlreWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1NjIzNjEsImV4cCI6MjEwNjEzODM2MX0.EexSOA7wqJiYVhd8aHXEc3i215nMAwMFgd_hvT7K0n4";

export const publicSupabase = createClient<any>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    storage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
  },
});
