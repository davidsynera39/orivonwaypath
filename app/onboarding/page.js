"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { T, Card, Btn, Input, Textarea, Select, Field } from "@/components/ui";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: "", description: "", industry: "", type: "saas", website: "", startDate: todayISO(),
    status: "idea", shortGoal: "", majorGoal: "", goal3mo: "", goal12mo: "",
  });
  const set = (k) => (v) => setDraft({ ...draft, [k]: v });

  const finish = async (journeyMode) => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: draft.name, description: draft.description, industry: draft.industry,
        businessType: draft.type, website: draft.website, startDate: draft.startDate, status: draft.status,
        journeyMode,
        goals: [
          { title: draft.shortGoal, kind: "short-term" }, { title: draft.majorGoal, kind: "major" },
          { title: draft.goal3mo, kind: "3-month" }, { title: draft.goal12mo, kind: "12-month" },
        ],
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setError(data.error || "Something went wrong.");
    router.push(`/dashboard?b=${data.businessId}`);
    router.refresh();
  };

  // IMPORTANT: this is a plain function that RETURNS JSX, called as shell(...)
  // — not used as a JSX component (<Shell .../>). If it were used as a
  // component, its function reference would change on every render (since it
  // closes over `step`/`error`), and React would treat it as a brand-new
  // component type each time — unmounting and remounting the whole subtree,
  // including the <input> underneath, which strips focus after every
  // keystroke. Calling it as a normal function avoids that entirely.
  function shell(title, sub, body, canNext, onNext) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.bodyFont, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Card className="onboard-card" style={{ width: 520, padding: 36 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
            {[1, 2, 3, 4].map((n) => <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: n <= step ? T.moss : T.line }} />)}
          </div>
          <p style={{ fontFamily: T.displayFont, fontSize: 24, margin: "0 0 4px" }}>{title}</p>
          <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 22px" }}>{sub}</p>
          {body}
          {error && <p style={{ color: T.red, fontSize: 13, marginTop: 12 }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            {step > 1 ? <Btn onClick={() => setStep(step - 1)}>Back</Btn> : <span />}
            {onNext && <Btn variant="primary" disabled={!canNext} style={{ opacity: canNext ? 1 : 0.5 }} onClick={onNext}>Continue</Btn>}
          </div>
        </Card>
      </div>
    );
  }

  if (step === 1)
    return shell(
      "Tell us about your business",
      "A few basics to get started — you can refine these anytime.",
      <>
        <Field label="Business name"><Input value={draft.name} onChange={(e) => set("name")(e.target.value)} placeholder="Orivon" /></Field>
        <Field label="Business description"><Textarea rows={3} value={draft.description} onChange={(e) => set("description")(e.target.value)} placeholder="What are you building, in a sentence or two?" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Industry"><Input value={draft.industry} onChange={(e) => set("industry")(e.target.value)} placeholder="Fintech" /></Field>
          <Field label="Business type">
            <Select value={draft.type} onChange={(e) => set("type")(e.target.value)}>
              <option value="saas">SaaS</option><option value="marketplace">Marketplace</option><option value="agency">Agency</option>
              <option value="ecommerce">E-commerce</option><option value="retail">Retail</option><option value="restaurant">Restaurant</option>
              <option value="creative">Creative business</option><option value="consulting">Consulting</option><option value="mobile_app">Mobile app</option>
              <option value="hardware">Hardware</option><option value="other">Other</option>
            </Select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Website (optional)"><Input value={draft.website} onChange={(e) => set("website")(e.target.value)} placeholder="orivon.com" /></Field>
          <Field label="Date started"><Input type="date" value={draft.startDate} onChange={(e) => set("startDate")(e.target.value)} /></Field>
        </div>
      </>,
      draft.name.trim().length > 0,
      () => setStep(2)
    );

  if (step === 2)
    return shell(
      "Where are you currently?",
      "This is just a starting point — your journey won't be forced into a template.",
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          ["idea", "Just an idea"], ["validating", "Validating the idea"], ["building", "Building"], ["mvp_ready", "MVP ready"],
          ["preparing_launch", "Preparing to launch"], ["launched", "Already launched"], ["growing", "Growing"], ["other", "Other"],
        ].map(([k, label]) => (
          <button key={k} onClick={() => set("status")(k)} style={{
            textAlign: "left", padding: "12px 14px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${draft.status === k ? T.moss : T.line}`, background: draft.status === k ? T.mossPale : "#fff",
            color: draft.status === k ? T.mossDeep : T.ink, fontSize: 14, fontWeight: draft.status === k ? 500 : 400,
          }}>{label}</button>
        ))}
      </div>,
      true,
      () => setStep(3)
    );

  if (step === 3)
    return shell(
      "What are you trying to achieve?",
      "Add as much or as little as you have right now.",
      <>
        <Field label="Short-term goal"><Input value={draft.shortGoal} onChange={(e) => set("shortGoal")(e.target.value)} placeholder="Ship a working prototype" /></Field>
        <Field label="Major business goal"><Input value={draft.majorGoal} onChange={(e) => set("majorGoal")(e.target.value)} placeholder="Reach $10k MRR" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="3-month goal"><Input value={draft.goal3mo} onChange={(e) => set("goal3mo")(e.target.value)} placeholder="Launch to first 100 users" /></Field>
          <Field label="12-month goal"><Input value={draft.goal12mo} onChange={(e) => set("goal12mo")(e.target.value)} placeholder="Reach profitability" /></Field>
        </div>
      </>,
      true,
      () => setStep(4)
    );

  // step 4
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.bodyFont, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <Card className="onboard-card" style={{ width: 520, padding: 36 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {[1, 2, 3, 4].map((n) => <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, background: T.moss }} />)}
        </div>
        <p style={{ fontFamily: T.displayFont, fontSize: 24, margin: "0 0 4px" }}>Build my journey</p>
        <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 22px" }}>Generate a journey based on your business, or start from scratch. Everything stays editable.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button disabled={saving} onClick={() => finish("generate")} style={{ textAlign: "left", padding: 18, borderRadius: 12, border: `1px solid ${T.moss}`, background: T.mossPale, cursor: "pointer" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 500, color: T.mossDeep }}>Generate my journey</p>
            <p style={{ margin: 0, fontSize: 13, color: T.mossDeep }}>We'll suggest stages that fit a {draft.type.replace("_", " ")} business — fully editable after.</p>
          </button>
          <button disabled={saving} onClick={() => finish("manual")} style={{ textAlign: "left", padding: 18, borderRadius: 12, border: `1px solid ${T.line}`, background: "#fff", cursor: "pointer" }}>
            <p style={{ margin: "0 0 4px", fontWeight: 500 }}>Create it myself</p>
            <p style={{ margin: 0, fontSize: 13, color: T.inkSoft }}>Start with a single stage and build your own journey from the ground up.</p>
          </button>
        </div>
        {error && <p style={{ color: T.red, fontSize: 13, marginTop: 14 }}>{error}</p>}
        <div style={{ marginTop: 20 }}><Btn onClick={() => setStep(3)}>Back</Btn></div>
      </Card>
    </div>
  );
}
