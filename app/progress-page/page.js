"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, ProgressBar } from "@/components/ui";
import { stageProgress, overallProgress } from "@/lib/data";

function ProgressPageInner() {
  const businessId = useSearchParams().get("b");
  const [business, setBusiness] = useState(null);

  useEffect(() => { if (businessId) fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => setBusiness(d.business)); }, [businessId]);
  if (!business) return <AppShell><p style={{ color: T.inkSoft, fontFamily: T.bodyFont }}>Loading…</p></AppShell>;

  const overall = overallProgress(business);
  const stagesDone = business.stages.filter((s) => s.milestones.length > 0 && s.milestones.every((m) => m.done)).length;
  const msDone = business.stages.flatMap((s) => s.milestones).filter((m) => m.done).length;
  const goalsDone = business.goals.filter((g) => g.status === "completed").length;
  const goalsActive = business.goals.filter((g) => g.status === "in_progress").length;

  const byMonth = {};
  business.timeline.forEach((e) => { const key = e.created_at.slice(0, 7); byMonth[key] = (byMonth[key] || 0) + 1; });
  const months = Object.keys(byMonth).sort().slice(-6);
  const maxVal = Math.max(1, ...months.map((m) => byMonth[m]));

  return (
    <AppShell>
      <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Progress</p>
      <p style={{ color: T.inkSoft, fontSize: 14, marginBottom: 20 }}>How far you've come on your own journey.</p>

      <Card style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 8px" }}>Overall journey</p>
        <p style={{ fontFamily: T.displayFont, fontSize: 34, margin: "0 0 10px" }}>{overall}%</p>
        <ProgressBar pct={overall} h={10} />
      </Card>

      <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {[["Stages completed", `${stagesDone} / ${business.stages.length}`], ["Milestones completed", msDone], ["Active goals", goalsActive], ["Goals completed", goalsDone]].map(([label, val]) => (
          <div key={label} style={{ background: T.surfaceSunk, borderRadius: 10, padding: 16 }}>
            <p style={{ fontSize: 12, color: T.inkSoft, margin: "0 0 6px" }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>{val}</p>
          </div>
        ))}
      </div>

      <Card style={{ marginBottom: 20 }}>
        <p style={{ fontWeight: 500, margin: "0 0 14px" }}>Stage completion</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {business.stages.map((s) => (
            <div key={s.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}><span>{s.name}</span><span style={{ color: T.inkSoft }}>{stageProgress(s)}%</span></div>
              <ProgressBar pct={stageProgress(s)} h={6} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p style={{ fontWeight: 500, margin: "0 0 14px" }}>Business activity, last {months.length || 0} months</p>
        {months.length === 0 ? <p style={{ fontSize: 13, color: T.inkFaint }}>Activity will appear here as you make progress.</p> : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 120 }}>
            {months.map((m) => (
              <div key={m} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                <div style={{ width: "60%", background: T.moss, borderRadius: "4px 4px 0 0", height: `${(byMonth[m] / maxVal) * 90}px` }} />
                <span style={{ fontSize: 11, color: T.inkFaint }}>{m.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}


export default function ProgressPage() {
  return (
    <Suspense fallback={null}>
      <ProgressPageInner />
    </Suspense>
  );
}
