import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Step 1: verify identity with the caller's own session (normal RLS-scoped client).
// Step 2: only then reach for the service-role client to do the one thing the
// user's own session can't — delete the auth.users row itself. Everything else
// (businesses, profile, subscription) cascades via `on delete cascade` in the schema.
export async function POST() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not delete account." }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
