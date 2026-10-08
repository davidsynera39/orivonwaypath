import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Not user-triggered — this scans across every business, so it runs with the
// service-role client and is gated by a shared secret instead of a session.
// Wire it to a scheduler (Vercel Cron, Supabase Edge Function cron, GitHub
// Actions, etc.) hitting this URL once a day with the header below.
//
// Example vercel.json:
// { "crons": [{ "path": "/api/cron/scan-deadlines", "schedule": "0 13 * * *" }] }
// Vercel Cron sends its own auth automatically; for anything else set
// CRON_SECRET and check it here.

export async function POST(request) {
  const secret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

  const created = [];

  // Overdue milestones
  const { data: overdueMilestones } = await supabase
    .from("milestones")
    .select("id, title, due_date, business_id, businesses(owner_id, name)")
    .lt("due_date", today)
    .eq("done", false);
  for (const m of overdueMilestones || []) {
    created.push({
      user_id: m.businesses.owner_id, business_id: m.business_id, type: "overdue",
      message: `"${m.title}" in ${m.businesses.name} was due ${m.due_date} and is still open.`,
    });
  }

  // Milestones due within 3 days
  const { data: upcomingMilestones } = await supabase
    .from("milestones")
    .select("id, title, due_date, business_id, businesses(owner_id, name)")
    .gte("due_date", today).lte("due_date", in3Days).eq("done", false);
  for (const m of upcomingMilestones || []) {
    created.push({
      user_id: m.businesses.owner_id, business_id: m.business_id, type: "deadline",
      message: `"${m.title}" in ${m.businesses.name} is due ${m.due_date}.`,
    });
  }

  // Goal deadlines within 3 days
  const { data: upcomingGoals } = await supabase
    .from("goals")
    .select("id, title, deadline, business_id, businesses(owner_id, name)")
    .gte("deadline", today).lte("deadline", in3Days).neq("status", "completed");
  for (const g of upcomingGoals || []) {
    created.push({
      user_id: g.businesses.owner_id, business_id: g.business_id, type: "goal_deadline",
      message: `Goal "${g.title}" in ${g.businesses.name} is due ${g.deadline}.`,
    });
  }

  // Avoid duplicate notifications: skip any (user_id, message) pair created in the last 24h.
  const { data: recent } = await supabase
    .from("notifications")
    .select("user_id, message")
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());
  const seen = new Set((recent || []).map((n) => `${n.user_id}::${n.message}`));
  const toInsert = created.filter((n) => !seen.has(`${n.user_id}::${n.message}`));

  if (toInsert.length) await supabase.from("notifications").insert(toInsert);

  return NextResponse.json({ created: toInsert.length });
}
