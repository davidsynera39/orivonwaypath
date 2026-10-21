import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// DANGER: this client bypasses Row Level Security entirely. Only import it
// into server-only code (route handlers) that has already verified the
// caller's identity via the normal session client — never expose it to the
// browser, never use it to answer a request you haven't authenticated first.
//
// Used for things a user's own session literally cannot do, like deleting
// their own auth.users row (self-deletion isn't exposed on the client SDK).
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured on the server.");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
