import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using service role key.
 * Use this for reading/writing encrypted credentials securely.
 * Do NOT expose this client to the browser.
 */
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  return createClient(url, serviceKey);
}
