import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Completes the link in Supabase's confirmation email. Supports both link
// styles so it works with the default template and a customised one:
//   ?code=...                  (default template; PKCE — same browser as signup)
//   ?token_hash=...&type=email (customised template; also works cross-device,
//                               e.g. signing up on a laptop, opening on a phone)
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNext(url.searchParams.get("next"));

  const supabase = createClient();
  let error = null;
  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = new Error("Missing confirmation parameters");
  }

  if (error) return redirectTo(request, "/login?error=confirm_failed");
  return redirectTo(request, next);
}

// Only allow redirects to paths on this site — never an attacker-supplied URL.
function safeNext(next) {
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")) return next;
  return "/onboarding";
}

// Behind a host's proxy (Render, Vercel) request.url can carry an internal
// address; the forwarded headers carry the real public one.
function redirectTo(request, path) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return NextResponse.redirect(`${proto}://${forwardedHost}${path}`);
  }
  return NextResponse.redirect(`${new URL(request.url).origin}${path}`);
}
