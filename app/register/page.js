"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { T, Card, Btn, Input, Field } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || !email || !password) return setError("Fill in every field.");
    if (password !== confirm) return setError("Passwords don't match.");
    if (!terms) return setError("Accept the terms to continue.");
    setError(""); setLoading(true);
    const { error: signUpError } = await supabase.auth.signUp({
      email, password, options: { data: { name } },
    });
    setLoading(false);
    if (signUpError) return setError(signUpError.message);
    router.push("/onboarding");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.bodyFont }}>
      <Card className="auth-card" style={{ width: 380, padding: 32 }}>
        <Link href="/" style={{ fontSize: 13, color: T.inkFaint, textDecoration: "none" }}>← Back</Link>
        <p style={{ fontFamily: T.displayFont, fontSize: 24, margin: "16px 0 4px" }}>Create your account</p>
        <p style={{ fontSize: 13, color: T.inkSoft, margin: "0 0 22px" }}>Start tracking your business journey.</p>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jordan Lee" /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /></Field>
        <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></Field>
        <Field label="Confirm password"><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" /></Field>
        <label style={{ display: "flex", gap: 8, fontSize: 13, color: T.inkSoft, marginBottom: 18 }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I agree to the Terms and Privacy Policy
        </label>
        {error && <p style={{ color: T.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <Btn variant="primary" style={{ width: "100%", padding: 12 }} onClick={submit} disabled={loading}>{loading ? "Creating…" : "Create account"}</Btn>
        <p style={{ textAlign: "center", fontSize: 13, color: T.inkSoft, marginTop: 16 }}>
          Already have an account? <Link href="/login" style={{ color: T.moss, fontWeight: 500 }}>Log in</Link>
        </p>
      </Card>
    </div>
  );
}
