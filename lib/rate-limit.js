import { createAdminClient } from "./supabase/admin";

// Fixed-window rate limiter. Uses the service-role client because the
// rate_limits table has no RLS policies for anon/authenticated — only the
// admin client (or the SECURITY DEFINER function it calls) can touch it.
//
// A plain in-memory counter would work per-instance but not across the
// multiple serverless function instances a real deployment runs behind —
// this hits Postgres instead so the limit is actually enforced globally.
//
// Usage: const limited = await rateLimit(supabase, { key: `ai:${user.id}`, max: 20, windowSeconds: 60 });
// if (!limited.ok) return 429.
export async function rateLimit(_callerSupabase, { key, max, windowSeconds }) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      // Fail open: a rate-limiter outage shouldn't take down the whole app.
      console.error("rate_limit check failed:", error.message);
      return { ok: true };
    }
    return { ok: data === true };
  } catch (e) {
    console.error("rate_limit error:", e.message);
    return { ok: true };
  }
}
