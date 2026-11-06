import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notifications: data || [] });
}

// Convenience creator, used by the deadline-scan job (see supabase/functions
// or a cron-triggered route you add later) and available for manual testing.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { businessId, type, message } = await request.json();
  if (!type || !message) return NextResponse.json({ error: "type and message are required." }, { status: 400 });

  const { data, error } = await supabase
    .from("notifications")
    .insert({ user_id: user.id, business_id: businessId || null, type, message })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notification: data });
}
