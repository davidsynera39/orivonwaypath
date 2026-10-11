import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: sheet, error: sErr } = await supabase.from("spreadsheets").select("*").eq("id", params.id).single();
  if (sErr || !sheet) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [{ data: columns }, { data: rows }] = await Promise.all([
    supabase.from("spreadsheet_columns").select("*").eq("spreadsheet_id", params.id).order("sort_order"),
    supabase.from("spreadsheet_rows").select("*").eq("spreadsheet_id", params.id).order("sort_order"),
  ]);

  return NextResponse.json({ spreadsheet: sheet, columns: columns || [], rows: rows || [] });
}

export async function PATCH(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json();
  const allowed = ["name", "description"];
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  patch.updated_at = new Date().toISOString();

  const { error } = await supabase.from("spreadsheets").update(patch).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { error } = await supabase.from("spreadsheets").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
