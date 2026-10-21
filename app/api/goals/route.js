import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { businessId, title, description, kind, deadline } = await request.json();
  if (!businessId || !title?.trim()) return NextResponse.json({ error: "Business and title are required." }, { status: 400 });

  const { data, error } = await supabase
    .from("goals")
    .insert({ business_id: businessId, title, description, kind: kind || "short-term", deadline: deadline || null })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ goal: data });
}
