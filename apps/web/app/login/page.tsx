"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type LoginResponse = {
  user?: { id: string; email: string; role: string };
  error?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const n = searchParams?.get("next");
    // امنیت: اجازه redirect به بیرون نده (فقط مسیرهای داخلی)
    if (!n) return "/";
    if (!n.startsWith("/")) return "/";
    return n;
  }, [searchParams]);

  const [email, setEmail] = useState("admin@mina.local");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    // Abort-safe: اگر درخواست قبلی هنوز هست، کنسلش کن
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    // validation خیلی ساده
    const em = email.trim();
    if (!em.includes("@")) {
      setMsg("ایمیل درست نیست.");
      return;
    }
    if (!password) {
      setMsg("پسورد را وارد کن.");
      return;
    }

    setLoading(true);
    try {
      // نکته: اینجا endpoint را عوض نمی‌کنیم.
      // اگر پروژه‌ات login را جای دیگری می‌زند، فقط همین URL را مطابق کد فعلی خودت تنظیم کن.
      const res = await fetch("http://127.0.0.1:3001/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        signal: ac.signal,
        body: JSON.stringify({ email: em, password }),
      });

      // اگر سرور error داد
      if (!res.ok) {
        let text = "";
        try {
          text = await res.text();
        } catch {}
        setMsg(`ورود ناموفق بود. (${res.status})`);
        // برای اینکه console.error صفر بماند، اینجا console.error نمی‌زنیم.
        return;
      }

      const data = (await res.json()) as LoginResponse;

      // اگر ساختار پاسخ متفاوت بود هم مشکلی نیست
      if (data?.error) {
        setMsg(data.error);
        return;
      }

      // موفق
      router.replace(nextPath);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMsg("درخواست قبلی کنسل شد.");
      } else {
        setMsg("مشکل اتصال. API بالا هست؟");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-lg p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">ورود</h1>
          <p className="text-sm text-slate-600 mt-1">
            با ایمیل و پسورد وارد شو.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">ایمیل</label>
            <input
              className="w-full rounded-lg border px-3 py-3 outline-none focus:ring-2 focus:ring-slate-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mina.local"
              autoComplete="email"
              inputMode="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">پسورد</label>
            <div className="flex gap-2">
              <input
                className="w-full rounded-lg border px-3 py-3 outline-none focus:ring-2 focus:ring-slate-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type={showPass ? "text" : "password"}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="shrink-0 rounded-lg border px-3 py-3 text-sm hover:bg-slate-50"
                onClick={() => setShowPass((v) => !v)}
              >
                {showPass ? "مخفی" : "نمایش"}
              </button>
            </div>
          </div>

          {msg ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {msg}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 text-white px-4 py-3 font-medium disabled:opacity-60"
          >
            {loading ? "در حال ورود..." : "ورود"}
          </button>

          <div className="text-xs text-slate-500">
            نکته: اگر ورود کار نکرد، اول مطمئن شو API روی 3001 بالاست و
            <code className="mx-1">/healthz</code> 200 می‌دهد.
          </div>
        </form>
      </div>
    </div>
  );
}
