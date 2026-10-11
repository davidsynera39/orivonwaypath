import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { businessId, stageId, title, dueDate } = await request.json();
  if (!businessId || !stageId || !title?.trim())
    return NextResponse.json({ error: "Business, stage, and title are required." }, { status: 400 });

  const { data, error } = await supabase
    .from("milestones")
    .insert({ business_id: businessId, stage_id: stageId, title, due_date: dueDate || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ milestone: data });
}
