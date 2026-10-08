import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFullBusiness } from "@/lib/data";
import { suggestGrants } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

// POST { businessId } → { suggestions: [...] }
// Returns candidates only — nothing is written to the grants table here.
// The user reviews them in the UI and calls POST /api/grants for the ones
// they want to track, same "AI proposes, user approves" pattern as the
// weekly check-in flow.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Suggestions are a heavier prompt than a chat message and there's no
  // reason to spam this — a handful per minute is more than enough.
  const limited = await rateLimit(supabase, { key: `grants:${user.id}`, max: 5, windowSeconds: 60 });
  if (!limited.ok) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const { businessId } = await request.json();
  if (!businessId) return NextResponse.json({ error: "businessId is required." }, { status: 400 });

  const business = await getFullBusiness(supabase, businessId);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const suggestions = await suggestGrants({ business });
    return NextResponse.json({ suggestions });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not generate grant suggestions right now." }, { status: 502 });
  }
}
