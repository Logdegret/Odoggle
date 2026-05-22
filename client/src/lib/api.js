// All data access now goes through the supabase client in lib/supabase.js
// This file is kept for any future direct fetch calls (e.g. Edge Functions).
export const functionsUrl = () =>
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
