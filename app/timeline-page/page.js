"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Input, EmptyState, fmtDate } from "@/components/ui";

function TimelinePageInner() {
  const businessId = useSearchParams().get("b");
  const [events, setEvents] = useState([]);
  const [note, setNote] = useState("");

  const load = () => { if (businessId) fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => setEvents(d.business.timeline)); };
  useEffect(load, [businessId]);

  const addNote = async () => { if (!note.trim()) return; await fetch("/api/timeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, text: note }) }); setNote(""); load(); };

  return (
    <AppShell>
      <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Business history</p>
      <p style={{ color: T.inkSoft, fontSize: 14, marginBottom: 20 }}>Everything you've accomplished, in order.</p>

      <Card style={{ marginBottom: 20, display: "flex", gap: 8 }}>
        <Input placeholder="Add a note to your history…" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} />
        <Btn variant="primary" onClick={addNote}>Add</Btn>
      </Card>

      {events.length === 0 ? (
        <EmptyState title="Nothing recorded yet" body="Your history builds automatically as you complete milestones and goals." />
      ) : (
        <div style={{ borderLeft: `2px solid ${T.line}`, marginLeft: 6 }}>
          {events.map((e) => (
            <div key={e.id} style={{ padding: "0 0 22px 20px", position: "relative" }}>
              <div style={{ position: "absolute", left: -7, top: 3, width: 12, height: 12, borderRadius: "50%", background: T.moss, border: "2px solid #fff" }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: T.inkFaint }}>{fmtDate(e.created_at)}</p>
              <p style={{ margin: "2px 0 0", fontSize: 14, color: T.ink }}>{e.text}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}


export default function TimelinePage() {
  return (
    <Suspense fallback={null}>
      <TimelinePageInner />
    </Suspense>
  );
}
