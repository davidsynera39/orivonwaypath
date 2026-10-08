"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Input, Pill, ProgressBar } from "@/components/ui";
import { stageProgress } from "@/lib/data";

function JourneyPageInner() {
  const businessId = useSearchParams().get("b");
  const [business, setBusiness] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const [newMsTitle, setNewMsTitle] = useState({});
  const [newStageName, setNewStageName] = useState("");

  const load = () => { if (businessId) fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => { setBusiness(d.business); setExpanded((prev) => prev.size ? prev : new Set([d.business.stages[d.business.current_stage_index]?.id])); }); };
  useEffect(load, [businessId]);

  if (!business) return <AppShell><p style={{ color: T.inkSoft, fontFamily: T.bodyFont }}>Loading…</p></AppShell>;

  const toggleExpand = (id) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const renameStage = async (id, name) => { setBusiness((b) => ({ ...b, stages: b.stages.map((s) => s.id === id ? { ...s, name } : s) })); await fetch(`/api/stages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); };
  const setCurrent = async (stageId) => { await fetch(`/api/businesses/${businessId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current_stage_id: stageId }) }); load(); };
  const deleteStage = async (id) => { if (business.stages.length <= 1) return; await fetch(`/api/stages/${id}`, { method: "DELETE" }); load(); };
  const addStage = async () => { if (!newStageName.trim()) return; await fetch("/api/stages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, name: newStageName, sortOrder: business.stages.length }) }); setNewStageName(""); load(); };
  const addMilestone = async (stageId) => { const title = (newMsTitle[stageId] || "").trim(); if (!title) return; await fetch("/api/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, stageId, title }) }); setNewMsTitle({ ...newMsTitle, [stageId]: "" }); load(); };
  const toggleMs = async (m) => { await fetch(`/api/milestones/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !m.done }) }); load(); };
  const deleteMs = async (id) => { await fetch(`/api/milestones/${id}`, { method: "DELETE" }); load(); };

  return (
    <AppShell>
      <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Business journey</p>
      <p style={{ color: T.inkSoft, fontSize: 14, marginBottom: 24 }}>The full path of your business, stage by stage. Rename, reorder, or add stages any time.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {business.stages.map((s) => {
          const isOpen = expanded.has(s.id);
          const isCurrent = s.id === business.stages[business.current_stage_index]?.id;
          const pct = stageProgress(s);
          return (
            <Card key={s.id} style={{ borderColor: isCurrent ? T.moss : T.line }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => toggleExpand(s.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: T.inkFaint }}>{isOpen ? "▾" : "▸"}</span>
                  <input value={s.name} onClick={(e) => e.stopPropagation()} onChange={(e) => renameStage(s.id, e.target.value)} className="stage-name-input" style={{ fontFamily: T.displayFont, fontSize: 17, border: "none", background: "transparent", color: T.ink, width: 220 }} />
                  {isCurrent && <Pill tone="moss">Current</Pill>}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                  <span style={{ fontSize: 13, color: T.inkSoft, marginRight: 4 }}>{pct}%</span>
                  {!isCurrent && <Btn variant="ghost" onClick={() => setCurrent(s.id)}>Set current</Btn>}
                  <Btn variant="danger" onClick={() => deleteStage(s.id)}>Delete</Btn>
                </div>
              </div>
              {isOpen && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.line}` }}>
                  {s.milestones.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                      {s.milestones.map((m) => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                          <input type="checkbox" checked={m.done} onChange={() => toggleMs(m)} />
                          <span style={{ flex: 1, textDecoration: m.done ? "line-through" : "none", color: m.done ? T.inkFaint : T.ink }}>{m.title}</span>
                          <button onClick={() => deleteMs(m.id)} style={{ background: "none", border: "none", color: T.inkFaint, cursor: "pointer", fontSize: 12 }}>Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ fontSize: 13, color: T.inkFaint, marginBottom: 12 }}>No milestones in this stage yet.</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <Input placeholder="Add a milestone…" value={newMsTitle[s.id] || ""} onChange={(e) => setNewMsTitle({ ...newMsTitle, [s.id]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addMilestone(s.id)} />
                    <Btn onClick={() => addMilestone(s.id)}>Add</Btn>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Input placeholder="New stage name…" value={newStageName} onChange={(e) => setNewStageName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addStage()} />
        <Btn variant="primary" onClick={addStage}>Add stage</Btn>
      </div>
    </AppShell>
  );
}


export default function JourneyPage() {
  return (
    <Suspense fallback={null}>
      <JourneyPageInner />
    </Suspense>
  );
}
