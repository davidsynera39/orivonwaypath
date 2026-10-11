"use client";
import { Suspense } from "react";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppShell from "@/components/AppShell";
import { T, Btn, Input } from "@/components/ui";

const SUGGESTIONS = ["What should I focus on this week?", "Why am I stuck?", "What have I accomplished so far?", "Help me plan my next stage."];

// Compact styling for markdown inside a chat bubble — tight spacing so it
// reads like a message, not a document. lib/ai.js's system prompt already
// asks the model to avoid tables/headings/heavy formatting; this is the
// fallback so that IF any markdown does come through (a bold word, a short
// list), it renders properly instead of showing raw "**" or "|" characters.
const markdownComponents = {
  p: ({ children }) => <p style={{ margin: "0 0 8px" }}>{children}</p>,
  ul: ({ children }) => <ul style={{ margin: "0 0 8px", paddingLeft: 18 }}>{children}</ul>,
  ol: ({ children }) => <ol style={{ margin: "0 0 8px", paddingLeft: 18 }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
  strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{children}</strong>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" style={{ color: T.moss, textDecoration: "underline" }}>{children}</a>,
  code: ({ children }) => <code style={{ background: "rgba(0,0,0,.06)", padding: "1px 5px", borderRadius: 4, fontSize: 13 }}>{children}</code>,
  // Safety net only — the prompt tells the model never to use tables, but if
  // one slips through anyway, render it as a real (small, scrollable) table
  // instead of a wall of "|" and "-" characters.
  table: ({ children }) => <div style={{ overflowX: "auto", margin: "0 0 8px" }}><table style={{ borderCollapse: "collapse", fontSize: 13 }}>{children}</table></div>,
  th: ({ children }) => <th style={{ border: `1px solid ${T.line}`, padding: "4px 8px", textAlign: "left", background: T.surfaceSunk }}>{children}</th>,
  td: ({ children }) => <td style={{ border: `1px solid ${T.line}`, padding: "4px 8px" }}>{children}</td>,
};

function AiPageInner() {
  const businessId = useSearchParams().get("b");
  const [business, setBusiness] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!businessId) return;
    fetch(`/api/businesses/${businessId}`).then((r) => r.json()).then((d) => setBusiness(d.business));
    fetch(`/api/ai?businessId=${businessId}`).then((r) => r.json()).then((d) => { setConversationId(d.conversationId); setMessages(d.messages.map((m) => ({ role: m.role, text: m.content }))); });
  }, [businessId]);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setMessages((m) => [...m, { role: "user", text: msg }]);
    setInput(""); setSending(true); setError("");
    const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ businessId, conversationId, message: msg }) });
    const data = await res.json();
    setSending(false);
    if (!res.ok) return setError(data.error || "The AI companion is unavailable right now.");
    setConversationId(data.conversationId);
    setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
  };

  return (
    <AppShell>
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)" }}>
        <p style={{ fontFamily: T.displayFont, fontSize: 26, margin: "0 0 4px" }}>AI business companion</p>
        <p style={{ color: T.inkSoft, fontSize: 14, marginBottom: 16 }}>Grounded in {business?.name || "your business"}'s actual stage, goals, and history. Powered by Groq.</p>
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", border: `1px solid ${T.line}`, borderRadius: 14, padding: 20, background: "#fff", marginBottom: 12 }}>
          {messages.length === 0 && <p style={{ fontSize: 14, color: T.inkFaint }}>Ask me anything about your journey, progress, or what to focus on next.</p>}
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
              <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: 12, fontSize: 14, lineHeight: 1.5, background: m.role === "user" ? T.moss : T.surfaceSunk, color: m.role === "user" ? "#fff" : T.ink }}>
                {m.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{m.text}</ReactMarkdown>
                ) : (
                  m.text
                )}
              </div>
            </div>
          ))}
          {sending && <p style={{ fontSize: 13, color: T.inkFaint }}>Thinking…</p>}
        </div>
        {error && <p style={{ color: T.red, fontSize: 13, marginBottom: 8 }}>{error}</p>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 999, border: `1px solid ${T.line}`, background: "#fff", cursor: "pointer", color: T.inkSoft }}>{s}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input placeholder="Ask about your business…" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
          <Btn variant="primary" onClick={() => send()} disabled={sending}>Send</Btn>
        </div>
      </div>
    </AppShell>
  );
}

export default function AiPage() {
  return (
    <Suspense fallback={null}>
      <AiPageInner />
    </Suspense>
  );
}
