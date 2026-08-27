"use client";

import { useState, type FormEvent } from "react";

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          returnTo,
        }),
      });
      const result = await response.json() as { error?: string; returnTo?: string };
      if (!response.ok) {
        setError(result.error ?? "Unable to sign in.");
        return;
      }
      window.location.replace(result.returnTo ?? "/studio");
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h2>Manager login</h2>
      <p>Sign in with the administrator email and password configured for this regional hub.</p>
      <label>
        Email address
        <input name="email" type="email" autoComplete="username" placeholder="manager@yourregion.org" required autoFocus />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" minLength={12} required />
      </label>
      {error && <output className="auth-login-error">{error}</output>}
      <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}<span>→</span></button>
    </form>
  );
}
