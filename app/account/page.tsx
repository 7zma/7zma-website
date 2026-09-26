"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const client = createSupabaseBrowserClient();
    if (!client) { setMessage("Connect Supabase to enable account sign-in."); setBusy(false); return; }
    const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setMessage(error ? "We could not send a sign-in link. Please check the address and try again." : "Check your inbox for a secure sign-in link."); setBusy(false);
  }
  return <main className="auth-shell" dir="auto"><Link className="auth-back" href="/">← 7ZMA</Link><section className="auth-card"><p className="eyebrow">YOUR 7ZMA ACCOUNT</p><h1>Welcome back</h1><p>Sign in with a secure, one-time email link.</p><form onSubmit={signIn}><label htmlFor="account-email">Email address</label><input id="account-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><button disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</button></form>{message && <p role="status">{message}</p>}<small>No password to remember. Your account is only created when you complete sign-in.</small></section></main>;
}
