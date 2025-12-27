"use client";

import { useSearchParams } from "next/navigation";

export default function LoginClient() {
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/dashboard";

  return (
    <main style={{ padding: 16 }}>
      <h1>Login</h1>
      <p>next: {next}</p>
    </main>
  );
}
