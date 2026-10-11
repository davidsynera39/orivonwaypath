"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { T } from "@/components/ui";

const NAV = [
  ["/dashboard", "Dashboard"], ["/journey", "Journey"], ["/milestones-page", "Milestones"],
  ["/goals-page", "Goals"], ["/timeline-page", "Timeline"], ["/journal-page", "Journal"],
  ["/progress-page", "Progress"], ["/grants-page", "Grants"], ["/spreadsheets-page", "Spreadsheets"], ["/checkin", "Weekly check-in"], ["/ai", "AI companion"],
  ["/notifications", "Notifications"], ["/settings", "Settings"],
];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();
  const [businesses, setBusinesses] = useState([]);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  // Only matters on mobile — see the .app-sidebar rules in globals.css.
  // At desktop widths those rules don't exist, so toggling this has no
  // visible effect there at all; the sidebar just stays as it always was.
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeId = params.get("b");

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then((d) => {
      setBusinesses(d.businesses || []);
      if (!activeId && d.businesses?.[0]) {
        const url = new URL(window.location.href);
        url.searchParams.set("b", d.businesses[0].id);
        router.replace(url.pathname + url.search);
      }
    });
    fetch("/api/notifications").then((r) => r.json()).then((d) => setUnread((d.notifications || []).filter((n) => !n.read).length));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the drawer automatically after navigating, so it doesn't stay
  // open covering the new page. No-op on desktop since the drawer isn't
  // rendered as an overlay there.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const active = businesses.find((b) => b.id === activeId);

  const withB = (path) => `${path}?b=${activeId || ""}`;

  const logout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.bodyFont, color: T.ink }}>
      <button
        className="app-hamburger"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        onClick={() => setMobileOpen((v) => !v)}
      >
        {mobileOpen ? "✕" : "☰"}
      </button>
      <div className={`app-sidebar-backdrop${mobileOpen ? " open" : ""}`} onClick={() => setMobileOpen(false)} />

      <aside className={`app-sidebar${mobileOpen ? " open" : ""}`} style={{ width: 224, borderRight: `1px solid ${T.line}`, padding: "24px 16px", display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        <div className="app-sidebar-brand" style={{ padding: "0 8px 20px" }}>
          <span style={{ fontFamily: T.displayFont, fontSize: 20, fontWeight: 600 }}>Waypath</span>
        </div>

        {businesses.length > 0 && (
          <div className="app-sidebar-switcher" style={{ position: "relative", marginBottom: 12 }}>
            <button onClick={() => setSwitcherOpen(!switcherOpen)} style={{ width: "100%", textAlign: "left", background: T.surfaceSunk, border: `1px solid ${T.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, cursor: "pointer" }}>
              {active?.name || "Select business"} ▾
            </button>
            {switcherOpen && (
              <div style={{ position: "absolute", top: 40, left: 0, right: 0, background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8, padding: 6, zIndex: 10, boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}>
                {businesses.map((b) => (
                  <button key={b.id} onClick={() => { const url = new URL(window.location.href); url.searchParams.set("b", b.id); router.push(url.pathname + url.search); setSwitcherOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 8px", fontSize: 13, border: "none", background: b.id === activeId ? T.mossPale : "transparent", borderRadius: 6, cursor: "pointer" }}>
                    {b.name}
                  </button>
                ))}
                <Link href="/onboarding" style={{ display: "block", padding: "7px 8px", fontSize: 13, color: T.moss, fontWeight: 500, textDecoration: "none" }}>+ New business</Link>
              </div>
            )}
          </div>
        )}

        {NAV.map(([path, label]) => (
          <Link key={path} href={withB(path)} className="app-nav-link" style={{
            padding: "9px 10px", borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: "none",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: pathname === path ? T.mossPale : "transparent", color: pathname === path ? T.mossDeep : T.inkSoft,
          }}>
            <span>{label}</span>
            {path === "/notifications" && unread > 0 && (
              <span style={{ background: T.clay, color: "#fff", fontSize: 11, fontWeight: 600, borderRadius: 999, padding: "1px 7px" }}>{unread}</span>
            )}
          </Link>
        ))}
        <div className="app-sidebar-spacer" style={{ flex: 1 }} />
        <button onClick={logout} className="app-logout" style={{ textAlign: "left", padding: "9px 10px", fontSize: 13, color: T.inkFaint, background: "none", border: "none", cursor: "pointer" }}>Log out</button>
      </aside>
      <main className="app-main" style={{ flex: 1, padding: "32px 40px", maxWidth: 1040, minWidth: 0 }}>{children}</main>
    </div>
  );
}
