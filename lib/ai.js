// AI provider abstraction. Everything in this file runs server-side only
// (imported by app/api/ai/route.js, app/api/checkins/route.js, and
// app/api/grants/suggest/route.js) — GROQ_API_KEY never reaches the browser.
//
// To swap providers later (OpenAI, Anthropic, a self-hosted model), only this
// file needs to change. Callers just get plain data back.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq's newer reasoning-capable models (including the current default below)
// deprecated the `max_tokens` parameter in favor of `max_completion_tokens`,
// and spend part of that budget on internal reasoning before writing the
// visible reply — so budgets here are deliberately generous, and every
// request sets reasoning_effort to "low" since none of these tasks (chat
// replies, structured extraction) need deep step-by-step reasoning; that
// keeps responses fast and leaves more of the token budget for the actual
// output instead of hidden reasoning tokens.
async function callGroq(body) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      reasoning_effort: "low",
      ...body,
    }),
  });
  if (!res.ok) {
    // Surface Groq's actual error body (e.g. invalid_request_error, model
    // decommissioned, bad param) instead of just the bare status code —
    // that detail is what actually tells you what to fix.
    const text = await res.text().catch(() => "");
    throw new Error(`Groq request failed (${res.status}): ${text || "no error body"}`);
  }
  return res.json();
}

function systemPromptFor(business) {
  const stage = business.stages?.[business.current_stage_index] || {};
  const openMilestones = (stage.milestones || []).filter((m) => !m.done).map((m) => m.title);
  const doneMilestones = (business.stages || [])
    .flatMap((s) => s.milestones || [])
    .filter((m) => m.done).length;
  const goals = (business.goals || [])
    .map((g) => `${g.title} (${g.status}, ${g.progress}% done)`)
    .join("; ");
  const recentJournal = (business.journal || [])
    .slice(0, 3)
    .map((j) => `- ${j.title}: ${j.content}`)
    .join("\n");

  return [
    `You are the AI business companion inside Waypath, a personal business journey tracker.`,
    `You help the founder of "${business.name}" (${business.business_type || "business"}) think clearly about their own progress.`,
    `Never compare this business to other companies, rankings, or benchmarks — Waypath is explicitly not a comparison tool.`,
    `Business description: ${business.description || "not provided"}`,
    `Current stage: ${stage.name || "unknown"}. Open milestones in this stage: ${openMilestones.join(", ") || "none"}.`,
    `Total milestones completed across the journey so far: ${doneMilestones}.`,
    `Active goals: ${goals || "none set"}.`,
    recentJournal ? `Recent journal entries:\n${recentJournal}` : "",
    `Answer using this business's actual data. Be specific and concrete, not generic startup advice. Keep replies under ~120 words unless asked for more detail.`,
    `Formatting: write in plain, conversational prose, like a text message from a sharp friend — not a report. Do not use markdown tables under any circumstances. Do not use headings or horizontal rules. Avoid bold text except for a single word or short phrase you genuinely want to emphasize. A short numbered or bulleted list is fine ONLY when the person explicitly asks for steps, options, or a plan, and even then keep it to a handful of short lines — never a table.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function getAiReply({ business, history, message }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const messages = [
    { role: "system", content: systemPromptFor(business) },
    ...history.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    { role: "user", content: message },
  ];

  const data = await callGroq({
    messages,
    temperature: 0.6,
    max_completion_tokens: 800,
  });

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Groq returned no reply.");
  return reply;
}

// Used by the weekly check-in flow to turn free text into structured
// milestone suggestions the user must approve before anything is saved.
export async function suggestFromCheckIn({ business, checkIn }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }
  const stage = business.stages?.[business.current_stage_index] || {};
  const prompt = [
    `Founder's weekly check-in for "${business.name}", currently in stage "${stage.name}":`,
    `Accomplished: ${checkIn.accomplished || "none noted"}`,
    `Not done: ${checkIn.not_done || "none noted"}`,
    `Problems: ${checkIn.problems || "none noted"}`,
    `Focus next week: ${checkIn.next_week || "none noted"}`,
    ``,
    `Respond ONLY with strict JSON, no markdown fences, in this exact shape:`,
    `{"completed_milestones": string[], "new_milestones": string[], "note": string}`,
    `completed_milestones: short titles for things that sound finished this week.`,
    `new_milestones: 1-4 short, concrete, actionable milestone titles for next week.`,
    `note: one sentence of encouragement or observation, grounded in what was written.`,
  ].join("\n");

  const data = await callGroq({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    max_completion_tokens: 900,
    response_format: { type: "json_object" },
  });

  const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return { completed_milestones: [], new_milestones: [], note: "" };
  }
}

// Suggests grant opportunities grounded in the business's actual profile.
//
// IMPORTANT LIMITATION: the model has no live access to which grant programs
// are currently open, real deadlines, or working application URLs — its
// training data goes stale and it can hallucinate plausible-sounding but
// fake or outdated programs. To keep this honest and useful rather than
// actively misleading, the prompt below:
//   1. Restricts suggestions to well-established, durable program categories
//      and agencies (SBIR/STTR, SBA, state economic development grants,
//      well-known industry accelerators) rather than obscure one-off grants
//      it's more likely to fabricate details about.
//   2. Explicitly forbids inventing deadlines or deep-link URLs — it must
//      point to the stable top-level official domain instead (grants.gov,
//      sba.gov, the relevant state's .gov site, etc.) so the user verifies
//      current details themselves rather than trusting a possibly-wrong date.
//   3. Returns structured JSON so the UI can render a consistent card and
//      attach its own disclaimer, rather than free text that reads as fact.
// Nothing here is written to the database until the user clicks "Save" —
// see app/api/grants/suggest/route.js.
export async function suggestGrants({ business }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }

  const stage = business.stages?.[business.current_stage_index] || {};
  const prompt = [
    `A founder is looking for grant funding for their business. Business profile:`,
    `Name: ${business.name}`,
    `Type: ${business.business_type || "unspecified"}`,
    `Industry: ${business.industry || "unspecified"}`,
    `Description: ${business.description || "not provided"}`,
    `Current stage: ${stage.name || "unknown"}`,
    ``,
    `Suggest 5 to 7 real, well-established grant or non-dilutive funding program CATEGORIES that plausibly fit this business — things like SBIR/STTR (if applicable to the industry), SBA programs, state or local economic development grants, well-known startup/nonprofit accelerator grants, or industry-specific federal programs. Prefer durable, well-known programs and agencies over obscure or highly specific one-off grants you're less certain still exist.`,
    ``,
    `Rules, followed strictly:`,
    `- Never invent a specific application deadline. If you don't know it's currently open, say so in the description instead of stating a date.`,
    `- Never invent a deep-link URL. official_url must be the program's stable top-level domain only (e.g. "https://www.sbir.gov", "https://www.sba.gov", "https://www.grants.gov", a state .gov domain) — never a fabricated specific page.`,
    `- amount_range should be an approximate, well-known range for that program type (e.g. "$50,000–$250,000"), or "varies" if genuinely unsure.`,
    `- fit_reason must reference something specific about THIS business (its industry, stage, or description) — not generic startup language.`,
    ``,
    `Respond ONLY with strict JSON, no markdown fences, in this exact shape:`,
    `{"grants": [{"name": string, "organization": string, "category": string, "description": string, "fit_reason": string, "amount_range": string, "official_url": string}]}`,
  ].join("\n");

  const data = await callGroq({
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_completion_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const raw = data.choices?.[0]?.message?.content?.trim() || "{}";
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.grants) ? parsed.grants : [];
  } catch {
    return [];
  }
}
