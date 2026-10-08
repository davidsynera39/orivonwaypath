"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Input, Textarea, EmptyState, fmtDate } from "@/components/ui";

function SpreadsheetsPageInner() {
  const businessId = useSearchParams().get("b");
  const router = useRouter();
  const [sheets, setSheets] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!businessId) return;
    fetch(`/api/spreadsheets?businessId=${businessId}`).then((r) => r.json()).then((d) => { setSheets(d.spreadsheets || []); setLoading(false); });
  };
  useEffect(load, [businessId]);

  const create = async () => {
    if (!form.name.trim()) return;
    const res = await fetch("/api/spreadsheets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, name: form.name, description: form.description }) });
    const data = await res.json();
    if (res.ok) router.push(`/spreadsheets-page/${data.spreadsheetId}?b=${businessId}`);
  };

  return (
    <AppShell>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Spreadsheets</p>
          <p style={{ color: T.inkSoft, fontSize: 14, margin: 0 }}>Catalog anything your business needs to track — inventory, suppliers, contacts, expenses.</p>
        </div>
        <Btn variant="primary" onClick={() => setShowNew(!showNew)}>{showNew ? "Cancel" : "New spreadsheet"}</Btn>
      </div>

      {showNew && (
        <Card style={{ marginBottom: 20 }}>
          <Input placeholder="Name (e.g. Inventory, Suppliers, Contacts)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ marginBottom: 10 }} />
          <Textarea rows={2} placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 10 }} />
          <Btn variant="primary" onClick={create}>Create spreadsheet</Btn>
        </Card>
      )}

      {!loading && sheets.length === 0 ? (
        <EmptyState title="No spreadsheets yet" body="Create one to start cataloging inventory, contacts, suppliers, or anything else." cta="New spreadsheet" onClick={() => setShowNew(true)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="grid-2">
          {sheets.map((s) => (
            <Card key={s.id} style={{ cursor: "pointer" }} onClick={() => router.push(`/spreadsheets-page/${s.id}?b=${businessId}`)}>
              <p style={{ fontWeight: 500, margin: "0 0 4px" }}>{s.name}</p>
              {s.description && <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 8px", lineHeight: 1.5 }}>{s.description}</p>}
              <p style={{ fontSize: 12, color: T.inkFaint, margin: 0 }}>{s.row_count} row{s.row_count === 1 ? "" : "s"} · created {fmtDate(s.created_at)}</p>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

export default function SpreadsheetsPage() {
  return (
    <Suspense fallback={null}>
      <SpreadsheetsPageInner />
    </Suspense>
  );
}
