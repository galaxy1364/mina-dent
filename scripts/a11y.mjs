import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = process.env.WEB_BASE_URL || "http://127.0.0.1:3000";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
    const results = await new AxeBuilder({ page }).analyze();
    const v = results.violations || [];
    if (v.length) {
process.exit(1);
    }
    console.log("a11y PASS");
    process.exit(0);
  } finally {
    await browser.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });

process.stderr.write("a11y failed
");
process.exit(1);

