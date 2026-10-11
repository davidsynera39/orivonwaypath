"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Input, Textarea, Pill, EmptyState } from "@/components/ui";

const STATUSES = { saved: "Saved", applied: "Applied", awarded: "Awarded", rejected: "Rejected", archived: "Archived" };
const STATUS_TONE = { saved: "gray", applied: "amber", awarded: "moss", rejected: "red", archived: "gray" };

function GrantsPageInner() {
  const businessId = useSearchParams().get("b");
  const [grants, setGrants] = useState([]);
  const [suggestions, setSuggestions] = useState(null);
  const [savedNames, setSavedNames] = useState(new Set());
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState({ name: "", organization: "", description: "", officialUrl: "" });
  const [filterStatus, setFilterStatus] = useState("all");

  const load = () => {
    if (!businessId) return;
    fetch(`/api/grants?businessId=${businessId}`).then((r) => r.json()).then((d) => {
      setGrants(d.grants || []);
      setSavedNames(new Set((d.grants || []).map((g) => g.name)));
    });
  };
  useEffect(load, [businessId]);

  const requestSuggestions = async () => {
    setSuggesting(true);
    setError("");
    setSuggestions(null);
    const res = await fetch("/api/grants/suggest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId }) });
    const data = await res.json();
    setSuggesting(false);
    if (!res.ok) return setError(data.error || "Could not generate suggestions right now.");
    if (!data.suggestions?.length) return setError("No suggestions came back — try again in a moment.");
    setSuggestions(data.suggestions);
  };

  const saveSuggestion = async (s) => {
    const res = await fetch("/api/grants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId, name: s.name, organization: s.organization, description: s.description,
        fitReason: s.fit_reason, amountRange: s.amount_range, category: s.category,
        officialUrl: s.official_url, source: "ai",
      }),
    });
    if (res.ok) { setSavedNames((prev) => new Set(prev).add(s.name)); load(); }
  };

  const saveManual = async () => {
    if (!manual.name.trim()) return;
    await fetch("/api/grants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, ...manual, source: "manual" }),
    });
    setManual({ name: "", organization: "", description: "", officialUrl: "" });
    setShowManual(false);
    load();
  };

  const setStatus = async (id, status) => { await fetch(`/api/grants/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); load(); };
  const remove = async (id) => { await fetch(`/api/grants/${id}`, { method: "DELETE" }); load(); };

  const filtered = filterStatus === "all" ? grants : grants.filter((g) => g.status === filterStatus);

  return (
    <AppShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Grants</p>
          <p style={{ color: T.inkSoft, fontSize: 14, margin: 0 }}>Non-dilutive funding worth looking into for this business.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={() => setShowManual(!showManual)}>{showManual ? "Cancel" : "Add manually"}</Btn>
          <Btn variant="primary" onClick={requestSuggestions} disabled={suggesting}>{suggesting ? "Thinking…" : "Suggest grants"}</Btn>
        </div>
      </div>

      <div style={{ background: T.amberPale, border: `1px solid ${T.line}`, borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#7A5613", lineHeight: 1.5 }}>
        Suggestions are AI-generated starting points, not a guarantee a program is currently open or that you qualify. Always confirm eligibility, deadlines, and how to apply on the official site before spending time on an application.
      </div>

      {error && <p style={{ color: T.red, fontSize: 13, marginBottom: 16 }}>{error}</p>}

      {showManual && (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 500, marginBottom: 10 }}>Add a grant you already know about</p>
          <Input placeholder="Grant or program name…" value={manual.name} onChange={(e) => setManual({ ...manual, name: e.target.value })} style={{ marginBottom: 10 }} />
          <Input placeholder="Organization (optional)" value={manual.organization} onChange={(e) => setManual({ ...manual, organization: e.target.value })} style={{ marginBottom: 10 }} />
          <Textarea rows={2} placeholder="Notes (optional)" value={manual.description} onChange={(e) => setManual({ ...manual, description: e.target.value })} style={{ marginBottom: 10 }} />
          <Input placeholder="Official website (optional)" value={manual.officialUrl} onChange={(e) => setManual({ ...manual, officialUrl: e.target.value })} style={{ marginBottom: 10 }} />
          <Btn variant="primary" onClick={saveManual}>Save grant</Btn>
        </Card>
      )}

      {suggestions && (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontWeight: 500, marginBottom: 10 }}>Suggestions for this business</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {suggestions.map((s, i) => {
              const alreadySaved = savedNames.has(s.name);
              return (
                <Card key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                        {s.category && <Pill tone="clay">{s.category}</Pill>}
                        {s.amount_range && <Pill>{s.amount_range}</Pill>}
                      </div>
                      <p style={{ fontWeight: 500, margin: "0 0 2px" }}>{s.name}</p>
                      {s.organization && <p style={{ fontSize: 12, color: T.inkFaint, margin: "0 0 8px" }}>{s.organization}</p>}
                      <p style={{ fontSize: 13, color: T.ink, margin: "0 0 6px", lineHeight: 1.5 }}>{s.description}</p>
                      {s.fit_reason && <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 6px", lineHeight: 1.5 }}><strong style={{ color: T.ink, fontWeight: 500 }}>Why it fits:</strong> {s.fit_reason}</p>}
                      {s.official_url && <a href={s.official_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.moss }}>{s.official_url} ↗</a>}
                    </div>
                    <Btn variant={alreadySaved ? "secondary" : "primary"} disabled={alreadySaved} onClick={() => saveSuggestion(s)} style={{ height: "fit-content" }}>
                      {alreadySaved ? "Saved" : "Save to track"}
                    </Btn>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontWeight: 500, margin: 0 }}>Tracked grants</p>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ fontSize: 13, padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.line}` }}>
          <option value="all">All statuses</option>
          {Object.entries(STATUSES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No grants tracked yet" body="Ask the AI for suggestions, or add one you already know about." cta="Suggest grants" onClick={requestSuggestions} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((g) => (
            <Card key={g.id}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                    <Pill tone={STATUS_TONE[g.status]}>{STATUSES[g.status]}</Pill>
                    {g.source === "ai" && <Pill>AI suggested</Pill>}
                    {g.amount_range && <Pill>{g.amount_range}</Pill>}
                  </div>
                  <p style={{ fontWeight: 500, margin: "0 0 2px" }}>{g.name}</p>
                  {g.organization && <p style={{ fontSize: 12, color: T.inkFaint, margin: "0 0 8px" }}>{g.organization}</p>}
                  {g.description && <p style={{ fontSize: 13, color: T.ink, margin: "0 0 6px", lineHeight: 1.5 }}>{g.description}</p>}
                  {g.official_url && <a href={g.official_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.moss }}>{g.official_url} ↗</a>}
                </div>
                <button onClick={() => remove(g.id)} style={{ background: "none", border: "none", color: T.inkFaint, cursor: "pointer", height: "fit-content" }}>✕</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {Object.entries(STATUSES).map(([k, label]) => (
                  <button key={k} onClick={() => setStatus(g.id, k)} style={{
                    fontSize: 11, padding: "4px 9px", borderRadius: 999, cursor: "pointer",
                    border: `1px solid ${g.status === k ? T.moss : T.line}`,
                    background: g.status === k ? T.mossPale : "transparent",
                    color: g.status === k ? T.mossDeep : T.inkSoft,
                  }}>{label}</button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default function GrantsPage() {
  return (
    <Suspense fallback={null}>
      <GrantsPageInner />
    </Suspense>
  );
}
