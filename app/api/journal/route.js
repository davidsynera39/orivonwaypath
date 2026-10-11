import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/data";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { businessId, title, content, tags } = await request.json();
  if (!businessId || !content?.trim()) return NextResponse.json({ error: "Business and content are required." }, { status: 400 });

  const { data, error } = await supabase
    .from("journal_entries")
    .insert({ business_id: businessId, title: title || "Untitled entry", content, tags: tags || [] })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logEvent(supabase, businessId, `Wrote a journal entry: "${data.title}".`);
  return NextResponse.json({ entry: data });
}
