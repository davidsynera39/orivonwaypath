import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { billingIsLive } from "@/lib/billing";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return NextResponse.json({ profile: { ...profile, email: user.email }, billingLive: billingIsLive });
}

export async function PATCH(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await request.json();
  const allowed = ["name", "theme", "notifications_enabled", "weekly_checkins_enabled", "ai_enabled"];
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
