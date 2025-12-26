import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const api = process.env.API_BASE_URL ?? "http://localhost:3001";

  const r = await fetch(`${api}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await r.text();
  if (!r.ok) return new NextResponse(text, { status: r.status });

  const data = JSON.parse(text) as { accessToken: string; refreshToken: string; accessTtlSeconds: number };

  const res = NextResponse.json({ ok: true });
  res.cookies.set("access_token", data.accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: data.accessTtlSeconds
  });
  res.cookies.set("refresh_token", data.refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return res;
}
