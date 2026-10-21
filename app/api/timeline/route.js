import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { businessId, text } = await request.json();
  if (!businessId || !text?.trim()) return NextResponse.json({ error: "Business and text are required." }, { status: 400 });

  const { data, error } = await supabase
    .from("timeline_events")
    .insert({ business_id: businessId, text, source: "manual" })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ event: data });
}
