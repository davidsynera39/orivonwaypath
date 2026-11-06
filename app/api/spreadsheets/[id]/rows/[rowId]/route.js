import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Body: { data: { "<column_id>": value, ... } } — merged into the row's
// existing data (not replaced), so updating one cell never clobbers others.
export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const { data: existing, error: readErr } = await supabase.from("spreadsheet_rows").select("data").eq("id", params.rowId).single();
  if (readErr || !existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const merged = { ...existing.data, ...(body.data || {}) };
  const patch = { data: merged, updated_at: new Date().toISOString() };
  if ("sort_order" in body) patch.sort_order = body.sort_order;

  const { error } = await supabase.from("spreadsheet_rows").update(patch).eq("id", params.rowId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { error } = await supabase.from("spreadsheet_rows").delete().eq("id", params.rowId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
