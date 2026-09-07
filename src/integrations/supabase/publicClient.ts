// Sessionless Supabase client for public pages (e.g. /erster-arbeitstag/:id)
// Always uses the anon role, even if a user is logged in in the same browser.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://gzgfyuftjvezqjkosntu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6Z2Z5dWZ0anZlenFqa29zbnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NDg2MTksImV4cCI6MjEwNDMyNDYxOX0.4bgK_e0ODXR1Jr-WXwIViMAtx6Ok7_4omAJOsC0r8BU";

export const publicSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
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
