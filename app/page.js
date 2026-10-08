import Link from "next/link";
import { T } from "@/lib/tokens";

export default function Landing() {
  const journeySteps = ["Idea", "Validation", "Building", "MVP", "Launch", "Traction", "Growth"];
  return (
    <div style={{ fontFamily: T.bodyFont, color: T.ink }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 48px", borderBottom: `1px solid ${T.line}` }}>
        <span style={{ fontFamily: T.displayFont, fontSize: 22, fontWeight: 600 }}>Waypath</span>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/login" style={{ padding: "9px 16px", fontSize: 14, fontWeight: 500, color: T.inkSoft, textDecoration: "none" }}>Log in</Link>
          <Link href="/register" style={{ padding: "9px 16px", borderRadius: 8, fontSize: 14, fontWeight: 500, background: T.moss, color: "#fff", textDecoration: "none" }}>Start free</Link>
        </div>
      </nav>

      <section style={{ padding: "88px 48px 64px", maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontFamily: T.displayFont, fontSize: 52, lineHeight: 1.1, fontWeight: 600, margin: "0 0 20px" }}>
          Build your business.<br />Track your journey.
        </h1>
        <p style={{ fontSize: 18, color: T.inkSoft, maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.6 }}>
          A personal workspace that helps you see where your business is, track what you've accomplished, and know what comes next.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/register" style={{ padding: "12px 22px", borderRadius: 8, fontSize: 15, fontWeight: 500, background: T.moss, color: "#fff", textDecoration: "none" }}>Start your journey</Link>
          <Link href="/login" style={{ padding: "12px 22px", borderRadius: 8, fontSize: 15, fontWeight: 500, border: `1px solid ${T.line}`, color: T.ink, textDecoration: "none" }}>I have an account</Link>
        </div>
      </section>

      <section style={{ padding: "0 48px 72px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 14, padding: 28 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: T.inkFaint, textTransform: "uppercase", letterSpacing: 0.6, margin: "0 0 16px" }}>An example journey</p>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
            {journeySteps.map((s, i) => (
              <div key={s} style={{ display: "contents" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, minWidth: 84 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", background: i < 2 ? T.moss : "transparent", border: `2px solid ${i <= 2 ? T.moss : T.line}` }} />
                  <span style={{ fontSize: 13, fontWeight: i === 2 ? 600 : 400, color: i <= 2 ? T.ink : T.inkFaint }}>{s}</span>
                </div>
                {i < journeySteps.length - 1 && <div style={{ flex: 1, height: 2, background: i < 2 ? T.moss : T.line, marginTop: -22, minWidth: 20 }} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 48px 72px", maxWidth: 980, margin: "0 auto" }}>
        <p style={{ fontFamily: T.displayFont, fontSize: 26, textAlign: "center", margin: "0 0 40px" }}>How it works</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          {[
            ["Describe your business", "Tell us what you're building — name, type, industry, and where you are today."],
            ["Get your journey", "Generate a sensible stage-by-stage journey, or build your own from scratch."],
            ["Track what matters", "Add milestones and goals, mark progress, and write down what you learn."],
            ["See what's next", "Your dashboard always shows where you are, what's done, and your next move."],
          ].map(([t, d], i) => (
            <div key={t} style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 14, padding: 20 }}>
              <p style={{ fontSize: 12, color: T.moss, fontWeight: 600, margin: "0 0 8px" }}>{String(i + 1).padStart(2, "0")}</p>
              <p style={{ fontWeight: 500, margin: "0 0 6px" }}>{t}</p>
              <p style={{ fontSize: 13, color: T.inkSoft, margin: 0, lineHeight: 1.5 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "0 48px 72px", maxWidth: 700, margin: "0 auto" }}>
        <p style={{ fontFamily: T.displayFont, fontSize: 26, textAlign: "center", margin: "0 0 12px" }}>Built for the founder, not the leaderboard</p>
        <p style={{ textAlign: "center", color: T.inkSoft, fontSize: 15, lineHeight: 1.6 }}>
          No rankings. No comparisons to other startups. No "you're ahead of X%". Just your business, your pace, your progress.
        </p>
      </section>

      <section style={{ padding: "0 48px 88px", maxWidth: 900, margin: "0 auto" }}>
        <p style={{ fontFamily: T.displayFont, fontSize: 26, textAlign: "center", margin: "0 0 40px" }}>Pricing</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 14, padding: 20 }}>
            <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 4px" }}>Free</p>
            <p style={{ fontFamily: T.displayFont, fontSize: 32, margin: "0 0 16px" }}>$0</p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14, color: T.inkSoft, lineHeight: 2 }}>
              <li>1 business</li><li>Custom business journey</li><li>Milestone tracking</li><li>Basic dashboard</li><li>Business timeline</li>
            </ul>
            <Link href="/register" style={{ display: "block", textAlign: "center", marginTop: 16, padding: 10, borderRadius: 8, border: `1px solid ${T.line}`, color: T.ink, textDecoration: "none" }}>Start free</Link>
          </div>
          <div style={{ background: "#fff", border: `2px solid ${T.moss}`, borderRadius: 14, padding: 20 }}>
            <span style={{ background: T.mossPale, color: T.mossDeep, fontSize: 12, padding: "3px 10px", borderRadius: 999 }}>Most popular</span>
            <p style={{ fontWeight: 500, fontSize: 15, margin: "10px 0 4px" }}>Pro</p>
            <p style={{ fontFamily: T.displayFont, fontSize: 32, margin: "0 0 16px" }}>$19<span style={{ fontSize: 14, color: T.inkSoft }}>/mo</span></p>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 14, color: T.inkSoft, lineHeight: 2 }}>
              <li>Multiple businesses</li><li>AI business companion</li><li>Advanced analytics</li><li>Automated progress insights</li><li>Detailed business history</li><li>Advanced goals and milestones</li>
            </ul>
            <Link href="/register" style={{ display: "block", textAlign: "center", marginTop: 16, padding: 10, borderRadius: 8, background: T.moss, color: "#fff", textDecoration: "none" }}>Start free trial</Link>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: T.inkFaint, marginTop: 16 }}>Payments aren't live yet — Pro currently unlocks instantly so you can preview the plan. See lib/billing.js.</p>
      </section>

      <footer style={{ borderTop: `1px solid ${T.line}`, padding: "28px 48px", display: "flex", justifyContent: "space-between", color: T.inkFaint, fontSize: 13 }}>
        <span>© 2026 Waypath</span>
        <span>A personal operating system for building a business.</span>
      </footer>
    </div>
  );
}
