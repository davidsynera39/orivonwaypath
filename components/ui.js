"use client";
import { T } from "@/lib/tokens";
export { T };


export function Btn({ children, variant = "secondary", style, ...rest }) {
  const base = { fontFamily: T.bodyFont, fontSize: 14, fontWeight: 500, padding: "9px 16px", borderRadius: 8, cursor: "pointer", border: "1px solid transparent" };
  const variants = {
    primary: { background: T.moss, color: "#fff", border: `1px solid ${T.moss}` },
    secondary: { background: T.surface, color: T.ink, border: `1px solid ${T.line}` },
    ghost: { background: "transparent", color: T.inkSoft, border: "1px solid transparent" },
    danger: { background: T.surface, color: T.red, border: `1px solid ${T.redPale}` },
  };
  return <button style={{ ...base, ...variants[variant], ...style }} {...rest}>{children}</button>;
}

export function Card({ children, style, ...rest }) {
  return <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: 14, padding: 20, ...style }} {...rest}>{children}</div>;
}

export function Input(props) {
  return <input {...props} style={{ fontFamily: T.bodyFont, fontSize: 14, padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, width: "100%", boxSizing: "border-box", color: T.ink, ...props.style }} />;
}
export function Textarea(props) {
  return <textarea {...props} style={{ fontFamily: T.bodyFont, fontSize: 14, padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, width: "100%", boxSizing: "border-box", resize: "vertical", color: T.ink, ...props.style }} />;
}
export function Select(props) {
  return <select {...props} style={{ fontFamily: T.bodyFont, fontSize: 14, padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, width: "100%", background: "#fff", color: T.ink, ...props.style }}>{props.children}</select>;
}
export function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}><label style={{ fontSize: 13, fontWeight: 500, color: T.inkSoft, display: "block", marginBottom: 6 }}>{label}</label>{children}</div>;
}
export function Pill({ children, tone = "gray" }) {
  const tones = { gray: { bg: T.surfaceSunk, fg: T.inkSoft }, moss: { bg: T.mossPale, fg: T.mossDeep }, clay: { bg: T.clayPale, fg: "#7A3A1D" }, red: { bg: T.redPale, fg: T.red }, amber: { bg: T.amberPale, fg: "#7A5613" } };
  const c = tones[tone];
  return <span style={{ background: c.bg, color: c.fg, fontSize: 12, fontWeight: 500, padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>{children}</span>;
}
export function ProgressBar({ pct, tone = T.moss, h = 8 }) {
  return <div style={{ background: T.surfaceSunk, borderRadius: 999, height: h, overflow: "hidden" }}><div style={{ width: `${pct}%`, background: tone, height: "100%", borderRadius: 999 }} /></div>;
}
export function EmptyState({ title, body, cta, onClick }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px", border: `1px dashed ${T.line}`, borderRadius: 14, background: T.surfaceSunk }}>
      <p style={{ fontFamily: T.displayFont, fontSize: 18, color: T.ink, margin: "0 0 6px" }}>{title}</p>
      <p style={{ fontSize: 14, color: T.inkSoft, margin: "0 0 18px" }}>{body}</p>
      {cta && <Btn variant="primary" onClick={onClick}>{cta}</Btn>}
    </div>
  );
}
export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
