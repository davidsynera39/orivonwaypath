import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/data";

// POST { businessId, stageId, newMilestones: string[] }
// Only called after the user clicks "Approve" in the UI — this is the one
// place AI output is allowed to mutate the journey, and only for what the
// founder explicitly confirmed.
export async function POST(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { businessId, stageId, newMilestones } = await request.json();
  if (!businessId || !stageId) return NextResponse.json({ error: "Business and stage are required." }, { status: 400 });

  const rows = (newMilestones || []).filter(Boolean).map((title) => ({ business_id: businessId, stage_id: stageId, title }));
  if (rows.length) await supabase.from("milestones").insert(rows);

  await supabase.from("weekly_checkins").update({ applied_suggestions: newMilestones || [] }).eq("id", params.id);
  await logEvent(supabase, businessId, "Completed weekly check-in.");

  return NextResponse.json({ ok: true, added: rows.length });
}
