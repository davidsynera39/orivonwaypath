import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name, type, options, sortOrder } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Column name is required." }, { status: 400 });

  const { data, error } = await supabase
    .from("spreadsheet_columns")
    .insert({ spreadsheet_id: params.id, name, type: type || "text", options: options || [], sort_order: sortOrder ?? 999 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ column: data });
}
