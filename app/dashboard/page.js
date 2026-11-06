"use client";
import { Suspense } from "react";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Pill, ProgressBar, EmptyState, Btn } from "@/components/ui";
import { stageProgress, overallProgress } from "@/lib/data";

function JourneyMap({ business }) {
  const stages = business.stages;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingBottom: 4 }}>
      {stages.map((s, i) => {
        const done = i < business.current_stage_index;
        const current = i === business.current_stage_index;
        return (
          <div key={s.id} style={{ display: "flex", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 96 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: done ? T.moss : "#fff", border: `2px solid ${done || current ? T.moss : T.line}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11 }}>
                {done ? "✓" : current ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.moss }} /> : ""}
              </div>
              <span style={{ fontSize: 12, textAlign: "center", fontWeight: current ? 600 : 400, color: done || current ? T.ink : T.inkFaint }}>{s.name}</span>
            </div>
            {i < stages.length - 1 && <div style={{ width: 40, height: 2, background: i < business.current_stage_index ? T.moss : T.line, marginTop: 8 }} />}
          </div>
        );
      })}
    </div>
  );
}

function DashboardInner() {
  const businessId = useSearchParams().get("b");
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!businessId) return;
    fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => { setBusiness(d.business); setLoading(false); });
  };
  useEffect(load, [businessId]);

  const stage = business?.stages[business.current_stage_index];
  const toggleMs = async (m) => {
    await fetch(`/api/milestones/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: !m.done }) });
    load();
  };

  const nextActions = useMemo(() => {
    if (!stage) return [];
    const open = stage.milestones.filter((m) => !m.done);
    if (open.length) return open.slice(0, 5).map((m) => m.title);
    return ["Add a milestone for this stage", "Review your goals", "Write a journal entry"];
  }, [stage]);

  if (loading || !business) return <AppShell><p style={{ color: T.inkSoft, fontFamily: T.bodyFont }}>Loading…</p></AppShell>;

  const pct = stageProgress(stage);
  const doneMs = stage?.milestones.filter((m) => m.done).length || 0;
  const remMs = (stage?.milestones.length || 0) - doneMs;
  const overall = overallProgress(business);

  return (
    <AppShell>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: T.displayFont, fontSize: 28, margin: "0 0 4px" }}>{business.name}</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <Pill tone="clay">{(business.business_type || "").replace("_", " ") || "business"}</Pill>
          {business.industry && <Pill>{business.industry}</Pill>}
        </div>
        <p style={{ color: T.inkSoft, fontSize: 14, maxWidth: 640, lineHeight: 1.5 }}>{business.description || "No description yet."}</p>
      </div>

      <div className="grid-2-wide" style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20, marginBottom: 20 }}>
        <Card>
          <p style={{ fontSize: 12, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 6px" }}>Current stage</p>
          <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 12px" }}>{stage?.name || "—"}</p>
          <ProgressBar pct={pct} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, color: T.inkSoft }}>
            <span>{pct}% complete</span><span>{doneMs} done · {remMs} remaining</span>
          </div>
        </Card>
        <Card style={{ background: T.mossDeep, border: "none", color: "#fff" }}>
          <p style={{ fontSize: 12, color: "#B9CDBF", textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 6px" }}>Overall journey</p>
          <p style={{ fontFamily: T.displayFont, fontSize: 36, margin: "0 0 12px" }}>{overall}%</p>
          <ProgressBar pct={overall} tone="#8FBBA1" />
          <p style={{ fontSize: 13, color: "#D9E5DC", marginTop: 12 }}>{business.stages.length} stages · {business.stages.flatMap((s) => s.milestones).filter((m) => m.done).length} milestones completed</p>
        </Card>
      </div>

      <Card style={{ marginBottom: 20, overflowX: "auto" }}>
        <p style={{ fontSize: 12, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 14px" }}>Journey map</p>
        <JourneyMap business={business} />
      </Card>

      <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card>
          <p style={{ fontWeight: 500, margin: "0 0 12px" }}>Your current focus</p>
          {stage?.milestones.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stage.milestones.map((m) => (
                <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, cursor: "pointer" }}>
                  <input type="checkbox" checked={m.done} onChange={() => toggleMs(m)} />
                  <span style={{ textDecoration: m.done ? "line-through" : "none", color: m.done ? T.inkFaint : T.ink }}>{m.title}</span>
                </label>
              ))}
            </div>
          ) : (
            <EmptyState title="No milestones yet" body="You haven't added any milestones yet." cta="Add your first milestone" onClick={() => (window.location.href = `/milestones-page?b=${businessId}`)} />
          )}
        </Card>
        <Card>
          <p style={{ fontWeight: 500, margin: "0 0 12px" }}>What's next?</p>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: T.ink, lineHeight: 2 }}>{nextActions.map((a, i) => <li key={i}>{a}</li>)}</ol>
        </Card>
      </div>
    </AppShell>
  );
}


export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardInner />
    </Suspense>
  );
}
