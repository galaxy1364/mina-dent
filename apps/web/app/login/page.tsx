"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@mina.local");
  const [password, setPassword] = useState("ChangeMe_12345");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error(await res.text());
      window.location.href = "/dashboard";
    } catch (e: any) {
      setErr(e?.message ?? "login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>ورود</h1>
      <form onSubmit={onSubmit}>
        <label>ایمیل</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
        />
        <label>رمز</label>
        <input
          value={password}
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, margin: "6px 0 12px" }}
        />
        <button disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "..." : "ورود"}
        </button>
      </form>
      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}
    </div>
  );
}
