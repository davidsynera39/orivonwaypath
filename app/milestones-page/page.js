"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Input, Select, Pill, EmptyState } from "@/components/ui";

const todayISO = () => new Date().toISOString().slice(0, 10);

function MilestonesPageInner() {
  const businessId = useSearchParams().get("b");
  const [business, setBusiness] = useState(null);
  const [filterStage, setFilterStage] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [newTitle, setNewTitle] = useState("");
  const [newStageId, setNewStageId] = useState("");
  const [newDue, setNewDue] = useState("");

  const load = () => { if (businessId) fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => { setBusiness(d.business); if (!newStageId) setNewStageId(d.business.stages[d.business.current_stage_index]?.id); }); };
  useEffect(load, [businessId]);
  if (!business) return <AppShell><p style={{ color: T.inkSoft, fontFamily: T.bodyFont }}>Loading…</p></AppShell>;

  const all = business.stages.flatMap((s) => s.milestones.map((m) => ({ ...m, stageId: s.id, stageName: s.name })));
  const today = todayISO();
  const filtered = all.filter((m) => {
    if (filterStage !== "all" && m.stageId !== filterStage) return false;
    if (filterStatus === "done" && !m.done) return false;
    if (filterStatus === "open" && m.done) return false;
    if (filterStatus === "overdue" && !(m.due_date && m.due_date < today && !m.done)) return false;
    return true;
  });

  const toggle = async (m) => { await fetch(`/api/milestones/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !m.done }) }); load(); };
  const setDue = async (id, due) => { await fetch(`/api/milestones/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ due_date: due }) }); load(); };
  const remove = async (id) => { await fetch(`/api/milestones/${id}`, { method: "DELETE" }); load(); };
  const addMilestone = async () => {
    if (!newTitle.trim()) return;
    await fetch("/api/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, stageId: newStageId, title: newTitle, dueDate: newDue }) });
    setNewTitle(""); setNewDue(""); load();
  };

  return (
    <AppShell>
      <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Milestones</p>
      <p style={{ color: T.inkSoft, fontSize: 14, marginBottom: 20 }}>Every concrete step across your journey, in one place.</p>

      <Card style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 500, margin: "0 0 10px" }}>Add a milestone</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Input style={{ flex: 2, minWidth: 160 }} placeholder="Milestone title…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Select style={{ flex: 1, minWidth: 140 }} value={newStageId} onChange={(e) => setNewStageId(e.target.value)}>
            {business.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Input style={{ flex: 1, minWidth: 140 }} type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
          <Btn variant="primary" onClick={addMilestone}>Add</Btn>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <Select style={{ width: 180 }} value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="all">All stages</option>
          {business.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select style={{ width: 180 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">All statuses</option><option value="open">Open</option><option value="done">Completed</option><option value="overdue">Overdue</option>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No milestones yet" body="You haven't added any milestones yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((m) => {
            const overdue = m.due_date && m.due_date < today && !m.done;
            return (
              <Card key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" }}>
                <input type="checkbox" checked={m.done} onChange={() => toggle(m)} />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, textDecoration: m.done ? "line-through" : "none", color: m.done ? T.inkFaint : T.ink }}>{m.title}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: T.inkFaint }}>{m.stageName}</p>
                </div>
                {overdue && <Pill tone="red">Overdue</Pill>}
                {m.done && <Pill tone="moss">Done</Pill>}
                <input type="date" value={m.due_date || ""} onChange={(e) => setDue(m.id, e.target.value)} style={{ fontSize: 12, border: `1px solid ${T.line}`, borderRadius: 6, padding: "4px 6px" }} />
                <button onClick={() => remove(m.id)} style={{ background: "none", border: "none", color: T.inkFaint, cursor: "pointer", fontSize: 12 }}>Remove</button>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}


export default function MilestonesPage() {
  return (
    <Suspense fallback={null}>
      <MilestonesPageInner />
    </Suspense>
  );
}
