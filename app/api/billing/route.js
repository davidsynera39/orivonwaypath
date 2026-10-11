import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startUpgrade, cancelPlan, openBillingPortal, billingIsLive } from "@/lib/billing";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limited = await rateLimit(supabase, { key: `billing:${user.id}`, max: 10, windowSeconds: 60 });
  if (!limited.ok) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const { action } = await request.json();
  const origin = request.headers.get("origin") || new URL(request.url).origin;

  try {
    if (action === "upgrade") {
      const result = await startUpgrade({ supabase, userId: user.id, userEmail: user.email, origin });
      return NextResponse.json({ ...result, live: billingIsLive });
    }
    if (action === "cancel") {
      const result = await cancelPlan({ supabase, userId: user.id });
      return NextResponse.json({ ok: true, ...result });
    }
    if (action === "portal") {
      const result = await openBillingPortal({ supabase, userId: user.id, origin });
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
