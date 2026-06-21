import { createClient } from '@supabase/supabase-js';

// Server-only client using the service role key. Bypasses RLS.
// Use exclusively from API routes for admin exports and elevated writes (§13).
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
