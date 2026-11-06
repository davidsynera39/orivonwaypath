"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Input, Textarea, Select, Pill, ProgressBar, EmptyState, fmtDate } from "@/components/ui";

function GoalsPageInner() {
  const businessId = useSearchParams().get("b");
  const [goals, setGoals] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", kind: "short-term", deadline: "" });

  const load = () => { if (businessId) fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => setGoals(d.business.goals)); };
  useEffect(load, [businessId]);

  const statuses = { not_started: "Not started", in_progress: "In progress", completed: "Completed", paused: "Paused", cancelled: "Cancelled" };

  const addGoal = async () => {
    if (!form.title.trim()) return;
    await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, ...form }) });
    setForm({ title: "", description: "", kind: "short-term", deadline: "" }); setShowNew(false); load();
  };
  const setStatus = async (id, status) => { await fetch(`/api/goals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); load(); };
  const setProgress = async (id, progress) => { setGoals((gs) => gs.map((g) => g.id === id ? { ...g, progress } : g)); await fetch(`/api/goals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ progress }) }); };
  const remove = async (id) => { await fetch(`/api/goals/${id}`, { method: "DELETE" }); load(); };

  return (
    <AppShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Goals</p>
          <p style={{ color: T.inkSoft, fontSize: 14, margin: 0 }}>Give yourself something meaningful to work toward.</p>
        </div>
        <Btn variant="primary" onClick={() => setShowNew(!showNew)}>{showNew ? "Cancel" : "New goal"}</Btn>
      </div>

      {showNew && (
        <Card style={{ marginBottom: 20 }}>
          <div className="grid-goal-form" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
            <Input placeholder="Goal title…" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="short-term">Short-term</option><option value="long-term">Long-term</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="custom">Custom</option>
            </Select>
            <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <Textarea style={{ marginTop: 10 }} rows={2} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Btn variant="primary" style={{ marginTop: 10 }} onClick={addGoal}>Create goal</Btn>
        </Card>
      )}

      {goals.length === 0 ? (
        <EmptyState title="No goals yet" body="Give yourself something meaningful to work toward." cta="Create a goal" onClick={() => setShowNew(true)} />
      ) : (
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {goals.map((g) => (
            <Card key={g.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div><Pill>{g.kind}</Pill><p style={{ fontWeight: 500, margin: "8px 0 4px" }}>{g.title}</p></div>
                <button onClick={() => remove(g.id)} style={{ background: "none", border: "none", color: T.inkFaint, cursor: "pointer" }}>✕</button>
              </div>
              {g.description && <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 10px" }}>{g.description}</p>}
              {g.deadline && <p style={{ fontSize: 12, color: T.inkFaint, margin: "0 0 10px" }}>Due {fmtDate(g.deadline)}</p>}
              <ProgressBar pct={g.progress} />
              <input type="range" min="0" max="100" value={g.progress} onChange={(e) => setProgress(g.id, Number(e.target.value))} style={{ width: "100%", marginTop: 8 }} />
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                {Object.entries(statuses).map(([k, label]) => (
                  <button key={k} onClick={() => setStatus(g.id, k)} style={{ fontSize: 11, padding: "4px 9px", borderRadius: 999, cursor: "pointer", border: `1px solid ${g.status === k ? T.moss : T.line}`, background: g.status === k ? T.mossPale : "transparent", color: g.status === k ? T.mossDeep : T.inkSoft }}>{label}</button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}


export default function GoalsPage() {
  return (
    <Suspense fallback={null}>
      <GoalsPageInner />
    </Suspense>
  );
}
