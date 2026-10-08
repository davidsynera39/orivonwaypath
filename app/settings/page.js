"use client";
import { Suspense } from "react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { createClient } from "@/lib/supabase/client";
import { T, Card, Btn, Input, Textarea, Field, Pill } from "@/components/ui";

function SettingsPageInner() {
  const businessId = useSearchParams().get("b");
  const router = useRouter();
  const supabase = createClient();
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [business, setBusiness] = useState(null);
  const [bizForm, setBizForm] = useState(null);
  const [billingLive, setBillingLive] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((d) => { setProfile(d.profile); setBillingLive(d.billingLive); });
    if (businessId) fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => { setBusiness(d.business); setBizForm(d.business); });
  }, [businessId]);

  if (!profile) return <AppShell><p style={{ color: T.inkSoft, fontFamily: T.bodyFont }}>Loading…</p></AppShell>;

  const saveProfile = async () => { await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: profile.name }) }); };
  const savePrefs = async (patch) => { const next = { ...profile, ...patch }; setProfile(next); await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }); };
  const saveBiz = async () => { await fetch(`/api/businesses/${businessId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: bizForm.name, description: bizForm.description, industry: bizForm.industry, website: bizForm.website, start_date: bizForm.start_date }) }); };
  const toggleUpgrade = async () => {
    setBillingBusy(true);
    const action = profile.plan === "pro" ? "cancel" : "upgrade";
    const res = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const data = await res.json();
    setBillingBusy(false);
    if (!res.ok) return alert(data.error || "Something went wrong.");
    if (data.redirectUrl && billingLive) { window.location.href = data.redirectUrl; return; }
    // Stub path: plan already flipped server-side, just reflect it locally.
    setProfile({ ...profile, plan: profile.plan === "pro" ? "free" : "pro" });
  };
  const openPortal = async () => {
    setBillingBusy(true);
    const res = await fetch("/api/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "portal" }) });
    const data = await res.json();
    setBillingBusy(false);
    if (!res.ok) return alert(data.error || "Could not open billing portal.");
    window.location.href = data.redirectUrl;
  };
  const logout = async () => { await supabase.auth.signOut(); router.push("/"); router.refresh(); };
  const deleteAccount = async () => {
    if (!confirm("Delete your account and all business data? This can't be undone.")) return;
    const res = await fetch("/api/account/delete", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Could not delete account.");
    router.push("/");
    router.refresh();
  };
  const deleteBusiness = async () => {
    if (!confirm(`Delete "${business?.name}" and everything in it — stages, milestones, goals, journal, history? This can't be undone.`)) return;
    await fetch(`/api/businesses/${businessId}`, { method: "DELETE" });
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <AppShell>
      <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 16px" }}>Settings</p>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[["profile", "Profile"], ["business", "Business"], ["preferences", "Preferences"], ["account", "Account"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 14px", borderRadius: 999, fontSize: 13, cursor: "pointer", border: `1px solid ${tab === k ? T.moss : T.line}`, background: tab === k ? T.mossPale : "#fff", color: tab === k ? T.mossDeep : T.inkSoft }}>{l}</button>
        ))}
      </div>

      {tab === "profile" && (
        <Card style={{ maxWidth: 480 }}>
          <Field label="Name"><Input value={profile.name || ""} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
          <Field label="Email"><Input value={profile.email} disabled /></Field>
          <Btn variant="primary" onClick={saveProfile}>Save profile</Btn>
        </Card>
      )}

      {tab === "business" && bizForm && (
        <Card style={{ maxWidth: 480 }}>
          <Field label="Business name"><Input value={bizForm.name} onChange={(e) => setBizForm({ ...bizForm, name: e.target.value })} /></Field>
          <Field label="Description"><Textarea rows={3} value={bizForm.description || ""} onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })} /></Field>
          <Field label="Industry"><Input value={bizForm.industry || ""} onChange={(e) => setBizForm({ ...bizForm, industry: e.target.value })} /></Field>
          <Field label="Website"><Input value={bizForm.website || ""} onChange={(e) => setBizForm({ ...bizForm, website: e.target.value })} /></Field>
          <Btn variant="primary" onClick={saveBiz} style={{ marginBottom: 20 }}>Save business</Btn>
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 16 }}>
            <Btn variant="danger" onClick={deleteBusiness}>Delete this business</Btn>
          </div>
        </Card>
      )}

      {tab === "preferences" && (
        <Card style={{ maxWidth: 480 }}>
          {[["notifications_enabled", "Enable notifications"], ["weekly_checkins_enabled", "Weekly check-in reminders"], ["ai_enabled", "AI business companion"]].map(([k, label]) => (
            <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, marginBottom: 12 }}>
              <input type="checkbox" checked={!!profile[k]} onChange={(e) => savePrefs({ [k]: e.target.checked })} /> {label}
            </label>
          ))}
        </Card>
      )}

      {tab === "account" && (
        <Card style={{ maxWidth: 480 }}>
          <p style={{ fontWeight: 500, margin: "0 0 6px" }}>Subscription</p>
          <Pill tone={profile.plan === "pro" ? "moss" : "gray"}>{profile.plan === "pro" ? "Pro" : "Free"} plan</Pill>
          <p style={{ fontSize: 13, color: T.inkSoft, margin: "10px 0 16px" }}>
            {billingLive
              ? "Managed by Stripe — upgrading opens secure checkout, and you can update your card or invoices anytime."
              : "Payments aren't live yet — this flips your plan directly for previewing. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO to go live (see lib/billing.js)."}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <Btn onClick={toggleUpgrade} disabled={billingBusy}>{profile.plan === "pro" ? "Downgrade to Free" : "Upgrade to Pro"}</Btn>
            {billingLive && profile.plan === "pro" && <Btn onClick={openPortal} disabled={billingBusy}>Manage billing</Btn>}
          </div>
          <div style={{ marginBottom: 20 }}><Btn onClick={logout}>Log out</Btn></div>
          <div style={{ borderTop: `1px solid ${T.line}`, paddingTop: 16 }}>
            <Btn variant="danger" onClick={deleteAccount}>Delete account</Btn>
          </div>
        </Card>
      )}
    </AppShell>
  );
}


export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageInner />
    </Suspense>
  );
}
