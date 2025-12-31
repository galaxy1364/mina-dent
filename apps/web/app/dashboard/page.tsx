import { cookies } from "next/headers";

async function getMe() {
  const api =
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://127.0.0.1:3001";

  const token = cookies().get("access_token")?.value;
  if (!token) return null;

  const res = await fetch(`${api}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function Dashboard() {
  const me = await getMe();

  return (
    <div style={{ padding: 16 }}>
      <h1>Ø¯Ø§Ø´Ø¨ÙˆØ±Ø¯</h1>
      <pre style={{ background: "#111", color: "#0f0", padding: 12, borderRadius: 10 }}>
        {JSON.stringify(me, null, 2)}
      </pre>

      <form action="/api/auth/logout" method="post">
        <button style={{ padding: "10px 14px" }}>Ø®Ø±ÙˆØ¬</button>
      </form>
    </div>
  );
}
