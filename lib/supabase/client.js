import { createBrowserClient } from "@supabase/ssr";

// Used in "use client" components. Reads the public URL + anon key only —
// safe to ship to the browser. Row Level Security is what actually protects
// data, not keeping this key secret.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
