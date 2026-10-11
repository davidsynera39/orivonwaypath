"use client";
import { Suspense } from "react";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Input, Select } from "@/components/ui";

const TYPES = [
  ["text", "Text"], ["number", "Number"], ["date", "Date"], ["checkbox", "Checkbox"], ["select", "Dropdown"],
];

function SpreadsheetEditorInner() {
  const businessId = useSearchParams().get("b");
  const { id } = useParams();
  const router = useRouter();

  const [sheet, setSheet] = useState(null);
  const [columns, setColumns] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingColId, setEditingColId] = useState(null);
  const [newColDraft, setNewColDraft] = useState(null); // { name, type, options }
  const [titleDraft, setTitleDraft] = useState("");

  const load = () => {
    fetch(`/api/spreadsheets/${id}`).then((r) => r.json()).then((d) => {
      if (d.spreadsheet) {
        setSheet(d.spreadsheet);
        setTitleDraft(d.spreadsheet.name);
        setColumns(d.columns || []);
        setRows(d.rows || []);
      }
      setLoading(false);
    });
  };
  useEffect(load, [id]);

  if (loading || !sheet) return <AppShell><p style={{ color: T.inkSoft, fontFamily: T.bodyFont }}>Loading…</p></AppShell>;

  /* ---------- spreadsheet-level actions ---------- */
  const saveTitle = async () => {
    if (!titleDraft.trim() || titleDraft === sheet.name) { setTitleDraft(sheet.name); return; }
    await fetch(`/api/spreadsheets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: titleDraft }) });
    setSheet({ ...sheet, name: titleDraft });
  };
  const deleteSheet = async () => {
    if (!confirm(`Delete "${sheet.name}" and everything in it? This can't be undone.`)) return;
    await fetch(`/api/spreadsheets/${id}`, { method: "DELETE" });
    router.push(`/spreadsheets-page?b=${businessId}`);
  };

  /* ---------- columns ---------- */
  const addColumn = async () => {
    if (!newColDraft?.name?.trim()) return;
    const options = newColDraft.type === "select" ? newColDraft.options.split(",").map((o) => o.trim()).filter(Boolean) : [];
    const res = await fetch(`/api/spreadsheets/${id}/columns`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newColDraft.name, type: newColDraft.type, options, sortOrder: columns.length }),
    });
    const data = await res.json();
    if (res.ok) setColumns([...columns, data.column]);
    setNewColDraft(null);
  };
  const updateColumn = async (colId, patch) => {
    setColumns((cs) => cs.map((c) => (c.id === colId ? { ...c, ...patch } : c)));
    await fetch(`/api/spreadsheets/${id}/columns/${colId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
  };
  const deleteColumn = async (colId) => {
    if (!confirm("Delete this column? Any data in it will be lost.")) return;
    setColumns((cs) => cs.filter((c) => c.id !== colId));
    setEditingColId(null);
    await fetch(`/api/spreadsheets/${id}/columns/${colId}`, { method: "DELETE" });
  };

  /* ---------- rows ---------- */
  const addRow = async () => {
    const res = await fetch(`/api/spreadsheets/${id}/rows`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: {}, sortOrder: rows.length }) });
    const data = await res.json();
    if (res.ok) setRows([...rows, data.row]);
  };
  const setCell = (rowId, colId, value) => {
    setRows((rs) => rs.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [colId]: value } } : r)));
  };
  const saveCell = async (rowId, colId, value) => {
    await fetch(`/api/spreadsheets/${id}/rows/${rowId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { [colId]: value } }) });
  };
  const deleteRow = async (rowId) => {
    setRows((rs) => rs.filter((r) => r.id !== rowId));
    await fetch(`/api/spreadsheets/${id}/rows/${rowId}`, { method: "DELETE" });
  };

  /* ---------- CSV export ---------- */
  const exportCsv = () => {
    const esc = (v) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.map((c) => esc(c.name)).join(",");
    const body = rows.map((r) => columns.map((c) => esc(r.data[c.id])).join(",")).join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sheet.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "spreadsheet"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cellInputStyle = { border: "none", background: "transparent", width: "100%", fontSize: 13, padding: "6px 8px", color: T.ink };

  return (
    <AppShell>
      <button onClick={() => router.push(`/spreadsheets-page?b=${businessId}`)} style={{ background: "none", border: "none", color: T.inkFaint, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12 }}>← All spreadsheets</button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <input
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          style={{ fontFamily: T.displayFont, fontSize: 26, border: "none", background: "transparent", color: T.ink, minWidth: 200 }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={exportCsv}>Export CSV</Btn>
          <Btn variant="danger" onClick={deleteSheet}>Delete</Btn>
        </div>
      </div>

<<<<<<< HEAD
      {editingColId && columns.find((c) => c.id === editingColId) && (() => {
        const col = columns.find((c) => c.id === editingColId);
        return (
          <Card style={{ marginBottom: 12, padding: 14 }}>
            <p style={{ fontSize: 12, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 10px" }}>Column settings</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 160 }}><Input value={col.name} onChange={(e) => updateColumn(col.id, { name: e.target.value })} style={{ fontSize: 13 }} /></div>
              <div style={{ width: 150 }}>
                <Select value={col.type} onChange={(e) => updateColumn(col.id, { type: e.target.value })} style={{ fontSize: 13 }}>
                  {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
              </div>
              {col.type === "select" && (
                <div style={{ flex: 1, minWidth: 180 }}>
                  <Input key={col.id} placeholder="Options, comma separated" defaultValue={(col.options || []).join(", ")}
                    onBlur={(e) => updateColumn(col.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })} style={{ fontSize: 13 }} />
                </div>
              )}
              <Btn variant="danger" onClick={() => deleteColumn(col.id)} style={{ fontSize: 12, padding: "6px 12px" }}>Delete column</Btn>
              <Btn variant="primary" onClick={() => setEditingColId(null)} style={{ fontSize: 12, padding: "6px 12px" }}>Done</Btn>
            </div>
          </Card>
        );
      })()}

=======
>>>>>>> 9533f3ceac526ea059c9605150c6ad652b9c2241
      <Card style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: columns.length * 160 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.id} style={{ borderBottom: `1px solid ${T.line}`, borderRight: `1px solid ${T.line}`, padding: 0, textAlign: "left", background: T.surfaceSunk, position: "relative", minWidth: 150 }}>
<<<<<<< HEAD
=======
                  {editingColId === col.id ? (
                    <div style={{ padding: 10, position: "absolute", top: "100%", left: 0, zIndex: 20, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, width: 220, boxShadow: "0 4px 16px rgba(0,0,0,.1)" }}>
                      <Input value={col.name} onChange={(e) => updateColumn(col.id, { name: e.target.value })} style={{ marginBottom: 8, fontSize: 13 }} />
                      <Select value={col.type} onChange={(e) => updateColumn(col.id, { type: e.target.value })} style={{ marginBottom: 8, fontSize: 13 }}>
                        {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </Select>
                      {col.type === "select" && (
                        <Input
                          placeholder="Options, comma separated"
                          defaultValue={(col.options || []).join(", ")}
                          onBlur={(e) => updateColumn(col.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                          style={{ marginBottom: 8, fontSize: 13 }}
                        />
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <button onClick={() => deleteColumn(col.id)} style={{ background: "none", border: "none", color: T.red, fontSize: 12, cursor: "pointer", padding: 0 }}>Delete column</button>
                        <button onClick={() => setEditingColId(null)} style={{ background: "none", border: "none", color: T.moss, fontSize: 12, cursor: "pointer", padding: 0, fontWeight: 500 }}>Done</button>
                      </div>
                    </div>
                  ) : null}
>>>>>>> 9533f3ceac526ea059c9605150c6ad652b9c2241
                  <button onClick={() => setEditingColId(editingColId === col.id ? null : col.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, color: T.ink, textAlign: "left" }}>
                    <span>{col.name}</span>
                    <span style={{ color: T.inkFaint, fontSize: 11 }}>▾</span>
                  </button>
                </th>
              ))}
              <th style={{ borderBottom: `1px solid ${T.line}`, background: T.surfaceSunk, padding: 0, minWidth: 140 }}>
                {newColDraft ? (
                  <div style={{ padding: 10 }}>
                    <Input placeholder="Column name" value={newColDraft.name} onChange={(e) => setNewColDraft({ ...newColDraft, name: e.target.value })} style={{ marginBottom: 8, fontSize: 13 }} autoFocus />
                    <Select value={newColDraft.type} onChange={(e) => setNewColDraft({ ...newColDraft, type: e.target.value })} style={{ marginBottom: 8, fontSize: 13 }}>
                      {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </Select>
                    {newColDraft.type === "select" && (
                      <Input placeholder="Options, comma separated" value={newColDraft.options} onChange={(e) => setNewColDraft({ ...newColDraft, options: e.target.value })} style={{ marginBottom: 8, fontSize: 13 }} />
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn variant="primary" onClick={addColumn} style={{ fontSize: 12, padding: "5px 10px" }}>Add</Btn>
                      <Btn onClick={() => setNewColDraft(null)} style={{ fontSize: 12, padding: "5px 10px" }}>Cancel</Btn>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setNewColDraft({ name: "", type: "text", options: "" })} style={{ width: "100%", padding: "10px 12px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: T.inkSoft, textAlign: "left" }}>+ Add column</button>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((col) => {
                  const val = row.data[col.id];
                  return (
                    <td key={col.id} style={{ borderBottom: `1px solid ${T.line}`, borderRight: `1px solid ${T.line}` }}>
                      {col.type === "checkbox" ? (
                        <div style={{ padding: "6px 8px" }}>
                          <input type="checkbox" checked={!!val} onChange={(e) => { setCell(row.id, col.id, e.target.checked); saveCell(row.id, col.id, e.target.checked); }} />
                        </div>
                      ) : col.type === "select" ? (
                        <select value={val || ""} onChange={(e) => { setCell(row.id, col.id, e.target.value); saveCell(row.id, col.id, e.target.value); }} style={{ ...cellInputStyle, cursor: "pointer" }}>
                          <option value=""></option>
                          {(col.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : col.type === "date" ? (
                        <input type="date" value={val || ""} onChange={(e) => { setCell(row.id, col.id, e.target.value); saveCell(row.id, col.id, e.target.value); }} style={cellInputStyle} />
                      ) : col.type === "number" ? (
                        <input type="number" value={val ?? ""} onChange={(e) => setCell(row.id, col.id, e.target.value)} onBlur={(e) => saveCell(row.id, col.id, e.target.value)} style={cellInputStyle} />
                      ) : (
                        <input type="text" value={val ?? ""} onChange={(e) => setCell(row.id, col.id, e.target.value)} onBlur={(e) => saveCell(row.id, col.id, e.target.value)} style={cellInputStyle} />
                      )}
                    </td>
                  );
                })}
                <td style={{ borderBottom: `1px solid ${T.line}`, textAlign: "center" }}>
                  <button onClick={() => deleteRow(row.id)} style={{ background: "none", border: "none", color: T.inkFaint, cursor: "pointer", fontSize: 12, padding: "6px 10px" }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow} style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "none", border: "none", borderTop: `1px solid ${T.line}`, cursor: "pointer", fontSize: 13, color: T.inkSoft }}>+ Add row</button>
      </Card>
    </AppShell>
  );
}

export default function SpreadsheetEditor() {
  return (
    <Suspense fallback={null}>
      <SpreadsheetEditorInner />
    </Suspense>
  );
}
