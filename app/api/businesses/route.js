import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JOURNEY_TEMPLATES, statusStartIndex, logEvent } from "@/lib/data";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase.from("businesses").select("*").eq("owner_id", user.id).order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ businesses: data });
}

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { name, description, industry, businessType, website, startDate, status, journeyMode, goals } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Business name is required." }, { status: 400 });

  // Free plan: 1 business per user.
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const { count } = await supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", user.id);
  if ((profile?.plan || "free") === "free" && (count || 0) >= 1) {
    return NextResponse.json({ error: "Free plan is limited to 1 business. Upgrade to Pro to add more." }, { status: 403 });
  }

  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .insert({
      owner_id: user.id, name, description, industry,
      business_type: businessType, website, start_date: startDate, current_status: status,
    })
    .select()
    .single();
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });

  const stageNames = journeyMode === "manual" ? ["Idea"] : (JOURNEY_TEMPLATES[businessType] || JOURNEY_TEMPLATES.other);
  const stageRows = stageNames.map((name, i) => ({ business_id: business.id, name, sort_order: i }));
  const { data: stages, error: sErr } = await supabase.from("business_stages").insert(stageRows).select();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

  const currentIdx = journeyMode === "manual" ? 0 : statusStartIndex(status, stages.length);
  await supabase.from("businesses").update({ current_stage_id: stages[currentIdx].id }).eq("id", business.id);

  const goalRows = (goals || []).filter((g) => g.title?.trim()).map((g) => ({ business_id: business.id, title: g.title, kind: g.kind }));
  if (goalRows.length) await supabase.from("goals").insert(goalRows);

  await logEvent(supabase, business.id, `Created ${name} and started the journey.`, "auto");

  return NextResponse.json({ businessId: business.id });
}
