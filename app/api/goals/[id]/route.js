import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/data";

export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const allowed = ["title", "description", "status", "progress", "deadline", "notes"];
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  if (patch.status === "completed") patch.progress = 100;

  const { data: goal, error } = await supabase.from("goals").update(patch).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (patch.status === "completed") await logEvent(supabase, goal.business_id, `Completed goal "${goal.title}".`);
  return NextResponse.json({ goal });
}

export async function DELETE(_request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { error } = await supabase.from("goals").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
