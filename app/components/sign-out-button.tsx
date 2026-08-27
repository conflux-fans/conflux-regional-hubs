"use client";

import { useState } from "react";

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/");
    }
  }

  return <button className="studio-sign-out" type="button" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : "Sign out"}</button>;
}
