import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, sortOrder } = await request.json();

  const { data: row, error } = await supabase
    .from("spreadsheet_rows")
    .insert({ spreadsheet_id: params.id, data: data || {}, sort_order: sortOrder ?? 999 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ row });
}
