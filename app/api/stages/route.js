import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { businessId, name, sortOrder } = await request.json();
  if (!businessId || !name?.trim()) return NextResponse.json({ error: "Business and stage name are required." }, { status: 400 });

  const { data, error } = await supabase
    .from("business_stages")
    .insert({ business_id: businessId, name, sort_order: sortOrder ?? 999 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ stage: data });
}

// Body: { stages: [{ id, sort_order }] } — used for drag-to-reorder.
export async function PATCH(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { stages } = await request.json();
  for (const s of stages || []) {
    await supabase.from("business_stages").update({ sort_order: s.sort_order }).eq("id", s.id);
  }
  return NextResponse.json({ ok: true });
}
