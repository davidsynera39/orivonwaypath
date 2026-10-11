import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getFullBusiness } from "@/lib/data";
import { getAiReply } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

// POST { businessId, conversationId?, message }
// Returns { reply, conversationId }. The business context sent to Groq is
// assembled server-side from this user's own rows only (see lib/data.js),
// so the model never sees another founder's data.
export async function POST(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // 20 messages/minute is generous for a real conversation but stops a
  // runaway loop (or a scripted abuse attempt) from burning through Groq quota.
  const limited = await rateLimit(supabase, { key: `ai:${user.id}`, max: 20, windowSeconds: 60 });
  if (!limited.ok) return NextResponse.json({ error: "You're sending messages too quickly. Wait a moment and try again." }, { status: 429 });

  const { businessId, conversationId, message } = await request.json();
  if (!businessId || !message?.trim())
    return NextResponse.json({ error: "Business and message are required." }, { status: 400 });

  const business = await getFullBusiness(supabase, businessId);
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let convoId = conversationId;
  if (!convoId) {
    const { data: convo, error } = await supabase.from("ai_conversations").insert({ business_id: businessId }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    convoId = convo.id;
  }

  const { data: priorMessages } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", convoId)
    .order("created_at")
    .limit(20);

  await supabase.from("ai_messages").insert({ conversation_id: convoId, role: "user", content: message });

  let reply;
  try {
    reply = await getAiReply({ business, history: priorMessages || [], message });
  } catch (e) {
    return NextResponse.json({ error: e.message || "The AI companion is unavailable right now." }, { status: 502 });
  }

  await supabase.from("ai_messages").insert({ conversation_id: convoId, role: "assistant", content: reply });

  return NextResponse.json({ reply, conversationId: convoId });
}

export async function GET(request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const businessId = new URL(request.url).searchParams.get("businessId");
  const { data: convo } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!convo) return NextResponse.json({ messages: [], conversationId: null });

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("conversation_id", convo.id)
    .order("created_at");

  return NextResponse.json({ messages: messages || [], conversationId: convo.id });
}
