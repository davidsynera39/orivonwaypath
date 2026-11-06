import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFullBusiness, logEvent } from "@/lib/data";

// RLS on `businesses` (owner_id = auth.uid()) means a mismatched id simply
// returns no row here — there is no code path that leaks another user's data.
export async function GET(_request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const business = await getFullBusiness(supabase, params.id);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ business });
}

export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const allowed = ["name", "description", "industry", "business_type", "website", "start_date", "current_status", "current_stage_id"];
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase.from("businesses").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (patch.current_stage_id) {
    const { data: stage } = await supabase.from("business_stages").select("name").eq("id", patch.current_stage_id).single();
    if (stage) await logEvent(supabase, params.id, `Moved into ${stage.name}.`);
  }
  return NextResponse.json({ ok: true });
}

// RLS scopes this to businesses.owner_id = auth.uid(), and every child table
// (stages, milestones, goals, journal, timeline, checkins, ai conversations)
// has `on delete cascade` back to businesses in supabase/schema.sql, so one
// delete here cleanly removes the whole business.
export async function DELETE(_request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { error } = await supabase.from("businesses").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
