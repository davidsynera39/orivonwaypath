"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Input, Textarea, Pill, EmptyState, fmtDate } from "@/components/ui";

function JournalPageInner() {
  const businessId = useSearchParams().get("b");
  const [entries, setEntries] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });

  const load = () => { if (businessId) fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => setEntries(d.business.journal)); };
  useEffect(load, [businessId]);

  const add = async () => {
    if (!form.content.trim()) return;
    await fetch("/api/journal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, title: form.title, content: form.content, tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean) }) });
    setForm({ title: "", content: "", tags: "" }); setShowNew(false); load();
  };
  const remove = async (id) => { await fetch(`/api/journal/${id}`, { method: "DELETE" }); load(); };

  return (
    <AppShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Journal</p>
          <p style={{ color: T.inkSoft, fontSize: 14, margin: 0 }}>Weekly updates, decisions, lessons, wins, and reflections.</p>
        </div>
        <Btn variant="primary" onClick={() => setShowNew(!showNew)}>{showNew ? "Cancel" : "Write an update"}</Btn>
      </div>

      {showNew && (
        <Card style={{ marginBottom: 20 }}>
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginBottom: 10 }} />
          <Textarea rows={5} placeholder="What's on your mind — a decision, a lesson, a win, a problem?" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} style={{ marginBottom: 10 }} />
          <Input placeholder="Tags, comma separated (e.g. lesson, win, pricing)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} style={{ marginBottom: 10 }} />
          <Btn variant="primary" onClick={add}>Save entry</Btn>
        </Card>
      )}

      {entries.length === 0 ? (
        <EmptyState title="No journal entries yet" body="Start documenting your business journey." cta="Write an update" onClick={() => setShowNew(true)} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {entries.map((e) => (
            <Card key={e.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontWeight: 500, margin: "0 0 4px" }}>{e.title}</p>
                <button onClick={() => remove(e.id)} style={{ background: "none", border: "none", color: T.inkFaint, cursor: "pointer" }}>✕</button>
              </div>
              <p style={{ fontSize: 12, color: T.inkFaint, margin: "0 0 8px" }}>{fmtDate(e.created_at)}</p>
              <p style={{ fontSize: 14, color: T.ink, whiteSpace: "pre-wrap", margin: "0 0 8px", lineHeight: 1.6 }}>{e.content}</p>
              <div style={{ display: "flex", gap: 6 }}>{(e.tags || []).map((t) => <Pill key={t}>{t}</Pill>)}</div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}


export default function JournalPage() {
  return (
    <Suspense fallback={null}>
      <JournalPageInner />
    </Suspense>
  );
}
