import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const businessId = new URL(request.url).searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("spreadsheets")
    .select("*, spreadsheet_rows(count)")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const sheets = (data || []).map((s) => ({ ...s, row_count: s.spreadsheet_rows?.[0]?.count ?? 0, spreadsheet_rows: undefined }));
  return NextResponse.json({ spreadsheets: sheets });
}

// Creates a new spreadsheet. If no columns are given, seeds three generic
// starter columns ("Name", "Notes", "Status") so the grid isn't empty —
// the user can rename, retype, delete, or add to them immediately after.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { businessId, name, description, columns } = await request.json();
  if (!businessId || !name?.trim()) return NextResponse.json({ error: "Business and name are required." }, { status: 400 });

  const { data: sheet, error: sErr } = await supabase
    .from("spreadsheets")
    .insert({ business_id: businessId, name, description: description || "" })
    .select()
    .single();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

  const starter = (columns && columns.length ? columns : [
    { name: "Name", type: "text" },
    { name: "Notes", type: "text" },
    { name: "Status", type: "text" },
  ]).map((c, i) => ({ spreadsheet_id: sheet.id, name: c.name, type: c.type || "text", options: c.options || [], sort_order: i }));

  const { error: cErr } = await supabase.from("spreadsheet_columns").insert(starter);
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 400 });

  return NextResponse.json({ spreadsheetId: sheet.id });
}
