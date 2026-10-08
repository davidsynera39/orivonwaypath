"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { T, Card, Btn, Input, Field } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return setError("Enter your email and password.");
    setError(""); setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) return setError(signInError.message);
    router.push("/dashboard");
    router.refresh();
  };

  const resetPassword = async () => {
    if (!email) return setError("Enter your email first, then click forgot password.");
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    setError("");
    alert("Check your email for a password reset link.");
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.bodyFont }}>
      <Card className="auth-card" style={{ width: 380, padding: 32 }}>
        <Link href="/" style={{ fontSize: 13, color: T.inkFaint, textDecoration: "none" }}>← Back</Link>
        <p style={{ fontFamily: T.displayFont, fontSize: 24, margin: "16px 0 4px" }}>Welcome back</p>
        <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 22px" }}>Log in to your business workspace.</p>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></Field>
        <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, fontSize: 13 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: T.inkSoft }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
          </label>
          <a href="#" onClick={(e) => { e.preventDefault(); resetPassword(); }} style={{ color: T.moss }}>Forgot password?</a>
        </div>
        {error && <p style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <Btn variant="primary" style={{ width: "100%", padding: 12 }} onClick={submit} disabled={loading}>{loading ? "Logging in…" : "Log in"}</Btn>
        <p style={{ textAlign: "center", fontSize: 13, color: T.inkSoft, marginTop: 16 }}>
          New here? <Link href="/register" style={{ color: T.moss, fontWeight: 500 }}>Create an account</Link>
        </p>
      </Card>
    </div>
  );
}
