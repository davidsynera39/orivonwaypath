// Server-side data helpers. Every function takes a Supabase client that
// already carries the caller's session (see lib/supabase/server.js), so RLS
// enforces ownership — these are convenience wrappers, not a security layer.

export async function getFullBusiness(supabase, businessId) {
  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();
  if (bErr || !business) return null;

  const [{ data: stages }, { data: milestones }, { data: goals }, { data: journal }, { data: timeline }, { data: checkins }] =
    await Promise.all([
      supabase.from("business_stages").select("*").eq("business_id", businessId).order("sort_order"),
      supabase.from("milestones").select("*").eq("business_id", businessId).order("created_at"),
      supabase.from("goals").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("journal_entries").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("timeline_events").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("weekly_checkins").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
    ]);

  const stagesWithMilestones = (stages || []).map((s) => ({
    ...s,
    milestones: (milestones || []).filter((m) => m.stage_id === s.id),
  }));

  const currentIndex = Math.max(0, stagesWithMilestones.findIndex((s) => s.id === business.current_stage_id));

  return {
    ...business,
    stages: stagesWithMilestones,
    current_stage_index: currentIndex === -1 ? 0 : currentIndex,
    goals: goals || [],
    journal: journal || [],
    timeline: timeline || [],
    checkins: checkins || [],
  };
}

export async function listBusinesses(supabase, ownerId) {
  const { data } = await supabase.from("businesses").select("id, name, business_type").eq("owner_id", ownerId).order("created_at");
  return data || [];
}

export async function logEvent(supabase, businessId, text, source = "auto") {
  await supabase.from("timeline_events").insert({ business_id: businessId, text, source });
}

export function stageProgress(stage) {
  if (!stage || !stage.milestones?.length) return 0;
  return Math.round((stage.milestones.filter((m) => m.done).length / stage.milestones.length) * 100);
}

export function overallProgress(business) {
  const all = (business.stages || []).flatMap((s) => s.milestones || []);
  if (!all.length) return 0;
  return Math.round((all.filter((m) => m.done).length / all.length) * 100);
}

export const JOURNEY_TEMPLATES = {
  saas: ["Idea", "Validation", "Prototype", "MVP", "Beta", "Launch", "Traction", "Growth"],
  marketplace: ["Idea", "Validation", "Supply setup", "MVP", "Pilot market", "Launch", "Liquidity", "Growth"],
  agency: ["Idea", "Brand setup", "Portfolio", "First clients", "Systemization", "Growth"],
  ecommerce: ["Idea", "Sourcing", "Store setup", "First sale", "Launch", "Traction", "Growth"],
  retail: ["Concept", "Location", "Funding", "Setup", "Soft opening", "Opening", "Growth"],
  restaurant: ["Concept", "Location", "Funding", "Setup", "Menu", "Soft launch", "Opening", "Growth"],
  creative: ["Idea", "Portfolio", "First clients", "Positioning", "Growth"],
  consulting: ["Idea", "Positioning", "First clients", "Case studies", "Growth"],
  mobile_app: ["Idea", "Validation", "Prototype", "MVP", "Beta", "Launch", "Growth"],
  hardware: ["Idea", "Validation", "Prototype", "Testing", "Manufacturing", "Launch", "Growth"],
  other: ["Idea", "Validation", "Building", "Launch", "Growth"],
};

export function statusStartIndex(status, length) {
  const map = {
    idea: 0, validating: 1, building: 2, mvp_ready: 3,
    preparing_launch: Math.max(length - 3, 0), launched: Math.max(length - 2, 0), growing: length - 1, other: 0,
  };
  return Math.min(map[status] ?? 0, length - 1);
}
