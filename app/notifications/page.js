"use client";
import { useEffect, useState, Suspense } from "react";
import AppShell from "@/components/AppShell";
import { T, Card, Btn, Pill, EmptyState, fmtDate } from "@/components/ui";

const TYPE_LABEL = {
  deadline: "Upcoming deadline", overdue: "Overdue milestone", checkin: "Weekly check-in",
  goal_deadline: "Goal deadline", stage_complete: "Stage completed", progress: "Progress update",
};

export default function NotificationsPage() {
  return (
    <Suspense fallback={null}>
      <NotificationsInner />
    </Suspense>
  );
}

function NotificationsInner() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => fetch("/api/notifications").then((r) => r.json()).then((d) => { setItems(d.notifications || []); setLoading(false); });
  useEffect(load, []);

  const markRead = async (id, read) => { await fetch(`/api/notifications/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ read }) }); load(); };
  const remove = async (id) => { await fetch(`/api/notifications/${id}`, { method: "DELETE" }); load(); };

  return (
    <AppShell>
      <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>Notifications</p>
      <p style={{ color: T.inkSoft, fontSize: 14, marginBottom: 20 }}>Deadlines, overdue milestones, and check-in reminders. Configure what you get notified about in Settings → Preferences.</p>

      {!loading && items.length === 0 && (
        <EmptyState title="You're all caught up" body="Deadlines and reminders will show up here as your journey progresses." />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((n) => (
          <Card key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", opacity: n.read ? 0.6 : 1 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                <Pill tone={n.read ? "gray" : "clay"}>{TYPE_LABEL[n.type] || n.type}</Pill>
                <span style={{ fontSize: 12, color: T.inkFaint }}>{fmtDate(n.created_at)}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: T.ink }}>{n.message}</p>
            </div>
            <Btn variant="ghost" onClick={() => markRead(n.id, !n.read)}>{n.read ? "Mark unread" : "Mark read"}</Btn>
            <button onClick={() => remove(n.id)} style={{ background: "none", border: "none", color: T.inkFaint, cursor: "pointer", fontSize: 12 }}>Remove</button>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
