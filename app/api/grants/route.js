import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("grants")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ grants: data || [] });
}

// Saves a grant — either one the AI suggested (source: "ai", called after the
// user clicks "Save" on a suggestion from /api/grants/suggest) or one the
// user typed in manually (source: "manual").
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { businessId, name } = body;
  if (!businessId || !name?.trim()) return NextResponse.json({ error: "Business and grant name are required." }, { status: 400 });

  const row = {
    business_id: businessId,
    name,
    organization: body.organization || "",
    description: body.description || "",
    fit_reason: body.fitReason || "",
    amount_range: body.amountRange || "",
    category: body.category || "",
    official_url: body.officialUrl || "",
    source: body.source === "manual" ? "manual" : "ai",
    deadline: body.deadline || null,
  };

  const { data, error } = await supabase.from("grants").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ grant: data });
}
