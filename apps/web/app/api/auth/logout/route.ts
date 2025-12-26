import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.redirect(new URL("/login", "http://localhost:3000"));
  res.cookies.set("access_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  res.cookies.set("refresh_token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
