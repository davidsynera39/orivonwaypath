import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFullBusiness, logEvent } from "@/lib/data";
import { suggestFromCheckIn } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

// POST { businessId, accomplished, notDone, problems, nextWeek }
// Saves the check-in and returns AI suggestions. Nothing on the journey
// (milestones added/completed) changes until the user approves via
// /api/checkins/[id]/apply — see app/checkin/page.js.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Check-ins are weekly by nature, so a tight limit here is just abuse protection.
  const limited = await rateLimit(supabase, { key: `checkin:${user.id}`, max: 10, windowSeconds: 60 });
  if (!limited.ok) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const { businessId, accomplished, notDone, problems, nextWeek } = await request.json();
  if (!businessId) return NextResponse.json({ error: "Business is required." }, { status: 400 });

  const { data: checkin, error } = await supabase
    .from("weekly_checkins")
    .insert({ business_id: businessId, accomplished, not_done: notDone, problems, next_week: nextWeek })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const business = await getFullBusiness(supabase, businessId);
  let suggestions = { completed_milestones: [], new_milestones: [], note: "" };
  try {
    suggestions = await suggestFromCheckIn({ business, checkIn: checkin });
  } catch (e) {
    // AI is optional here — the check-in itself is already saved.
    suggestions.note = "AI suggestions unavailable right now, but your check-in was saved.";
  }

  return NextResponse.json({ checkinId: checkin.id, suggestions });
}
