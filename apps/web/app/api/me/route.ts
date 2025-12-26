import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const api = process.env.API_BASE_URL ?? "http://localhost:3001";
  const token = cookies().get("access_token")?.value;

  if (!token) return new NextResponse("unauthorized", { status: 401 });

  const r = await fetch(`${api}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  const text = await r.text();
  return new NextResponse(text, { status: r.status, headers: { "content-type": "application/json" } });
}
