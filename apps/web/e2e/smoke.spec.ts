import { test, expect } from "@playwright/test";

test("dashboard loads with zero console errors", async ({ page, request }) => {
  test.setTimeout(60_000);

  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e?.message ?? String(e)}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });

  const WEB = "http://127.0.0.1:3000";
  const API = "http://127.0.0.1:3001";

  const loginResp = await request.post(`${API}/auth/login`, {
    data: { email: "admin@mina.local", password: "ChangeMe_12345" },
  });
  expect(loginResp.ok()).toBeTruthy();

  const body: any = await loginResp.json().catch(() => ({}));
  const token =
    body?.accessToken ??
    body?.access_token ??
    body?.token ??
    body?.access?.token;

  expect(token, "login response did not include a token").toBeTruthy();

  await page.context().addCookies([
    {
      name: "access_token",
      value: String(token),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  await page.goto(`${WEB}/dashboard`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1")).toContainText("داشبورد",   { timeout: 30_000 });

  expect(errors, `JS errors:\n${errors.join("\n")}`).toEqual([]);
});



