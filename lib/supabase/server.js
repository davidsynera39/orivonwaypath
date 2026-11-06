import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Used in Server Components, Route Handlers, and Server Actions. Reads the
// user's session from cookies, so every query runs AS that user and is
// enforced by the RLS policies in supabase/schema.sql — a handler can never
// accidentally return another user's row just because it forgot a WHERE clause.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — middleware.js already
            // refreshes the session cookie on every request, so this is safe to ignore.
          }
        },
      },
    }
  );
}
