"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Textarea, Field, fmtDate } from "@/components/ui";

function CheckInPageInner() {
  const businessId = useSearchParams().get("b");
  const [business, setBusiness] = useState(null);
  const [form, setForm] = useState({ accomplished: "", notDone: "", problems: "", nextWeek: "" });
  const [result, setResult] = useState(null);
  const [checkinId, setCheckinId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => { if (businessId) fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => setBusiness(d.business)); };
  useEffect(load, [businessId]);
  if (!business) return <AppShell><p style={{ color: T.inkSoft, fontFamily: T.bodyFont }}>Loading…</p></AppShell>;

  const stage = business.stages[business.current_stage_index];

  const submit = async () => {
    setBusy(true);
    const res = await fetch("/api/checkins", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, ...form }) });
    const data = await res.json();
    setBusy(false);
    if (res.ok) { setResult(data.suggestions); setCheckinId(data.checkinId); }
  };

  const approve = async () => {
    await fetch(`/api/checkins/${checkinId}/apply`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, stageId: stage.id, newMilestones: result.new_milestones }) });
    setForm({ accomplished: "", notDone: "", problems: "", nextWeek: "" });
    setResult(null); setCheckinId(null); load();
  };

  return (
    <AppShell>
      <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Weekly check-in</p>
      <p style={{ color: T.inkSoft, fontSize: 14, marginBottom: 20 }}>A quick pulse on the week — used to keep your journey up to date.</p>

      <Card style={{ marginBottom: 16 }}>
        <Field label="What did you accomplish?"><Textarea rows={3} value={form.accomplished} onChange={(e) => setForm({ ...form, accomplished: e.target.value })} /></Field>
        <Field label="What didn't get done?"><Textarea rows={2} value={form.notDone} onChange={(e) => setForm({ ...form, notDone: e.target.value })} /></Field>
        <Field label="What problems did you face?"><Textarea rows={2} value={form.problems} onChange={(e) => setForm({ ...form, problems: e.target.value })} /></Field>
        <Field label="What are you focusing on next week?"><Textarea rows={2} value={form.nextWeek} onChange={(e) => setForm({ ...form, nextWeek: e.target.value })} /></Field>
        <Btn variant="primary" disabled={busy} onClick={submit}>{busy ? "Analyzing…" : "Review suggestions"}</Btn>
      </Card>

      {result && (
        <Card style={{ border: `1px solid ${T.moss}`, background: T.mossPale }}>
          <p style={{ fontWeight: 500, margin: "0 0 10px", color: T.mossDeep }}>Suggested updates to your journey</p>
          {result.note && <p style={{ fontSize: 13, color: T.mossDeep, margin: "0 0 10px" }}>{result.note}</p>}
          {result.completed_milestones?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: T.mossDeep, margin: "0 0 4px" }}>Sounds accomplished this week</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: T.mossDeep }}>{result.completed_milestones.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          {result.new_milestones?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: T.mossDeep, margin: "0 0 4px" }}>New milestones to add to &ldquo;{stage.name}&rdquo;</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: T.mossDeep }}>{result.new_milestones.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn variant="primary" onClick={approve}>Approve and save</Btn>
            <Btn onClick={() => { setResult(null); setCheckinId(null); }}>Discard</Btn>
          </div>
        </Card>
      )}

      {business.checkins?.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <p style={{ fontWeight: 500, margin: "0 0 10px" }}>Past check-ins</p>
          {business.checkins.map((c) => (
            <Card key={c.id} style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: T.inkFaint, margin: "0 0 6px" }}>{fmtDate(c.created_at)}</p>
              <p style={{ fontSize: 14, margin: 0 }}>{c.accomplished}</p>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}


export default function CheckInPage() {
  return (
    <Suspense fallback={null}>
      <CheckInPageInner />
    </Suspense>
  );
}
