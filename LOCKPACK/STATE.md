# LOCKPACK/STATE.md — وضعیت و قرارداد اجرای قفل‌ها (Repo-Level)

> این فایل «منبع حقیقت» برای قفل‌های تحویل/انتشار است.  
> **قانون سخت:** تا وقتی همه Lockها فعال و Evidence کامل نباشد ⇒ **STOP**. هیچ bypass/استثناء وجود ندارد.

## 1) تعریف LOCKPACK (اجزای غیرقابل حذف)
LOCKPACK از ۶ جزء تشکیل شده و *همه* باید همزمان فعال باشند:

1. **Org Ruleset (GitHub Rulesets / Branch Protection)**
   - شاخه‌های اصلی (مثلاً `main`) باید محافظت شوند.
   - Merge فقط با Required Checks + Required Reviews + عدم امکان Force-Push/Bypass.
2. **Required Gates (Quality Gates)**
   - Build/Lint/Typecheck/Test/E2E/Perf/Security + Gateهای اختصاصی پروژه.
   - معیار حیاتی: **Zero JS Runtime Errors** و **No Infinite Pending** و **Abort-safe**.
3. **CODEOWNERS**
   - تغییرات روی مسیرهای حیاتی باید *الزاماً* توسط مالک‌ها review شود.
4. **HashLock (Integrity / Manifest)**
   - تولید `LOCKPACK/HASHLOCK.sha256` از کل فایل‌های track شده (git ls-files).
5. **Evidence (قابل راستی‌آزمایی)**
   - `evidence/QG.json` + `snapshot/` + `manifest.sha256` + بسته‌ی Evidence با امضا.
6. **Protected Prod (Release Safety)**
   - Deploy فقط از `main`/tagهای مشخص + محیط Production با Approval/Environment Protection.

---

## 2) PASS/FAIL/STOP (تعریف دقیق)
### PASS (اجازه‌ی Merge/Release)
همه موارد زیر باید **همزمان** برقرار باشند:

- **0 خطای JS Runtime**
  - `pageerror` / `unhandledrejection` / `console.error` = **0**
- **No Infinite Pending**
  - هیچ تست یا مرحله‌ای نباید بدون timeout رها شود.
- **Abort-safe**
  - هر مرحله‌ی async باید در صورت شکست/لغو به وضعیت `ABORTED` برسد و فرآیند hang نکند.
- **Signed CI Artifact**
  - بسته‌ی Evidence باید امضا شود (OIDC Keyless / cosign) و همراه Signature + Certificate باشد.
- **Evidence کامل**
  - `QG.json` + snapshot + hash/manifest + artifact upload موجود باشد.

### FAIL
اگر حتی **یک** مورد FAIL شود، یا **یک** خطای JS ثبت شود ⇒ FAIL.

### STOP (پیش‌فرض)
اگر هر جزء LOCKPACK **تنظیم نشده / نامشخص / بدون Evidence** باشد ⇒ STOP.

---

## 3) مسیرهای مجاز تغییر (One-way)
تنها سه مسیر مجاز است:
- **PROCEED:** فقط وقتی همه Gateها PASS هستند.
- **FIX-to-PASS:** فقط اصلاح محدود و کم‌ریسک تا PASS.
- **ROLLBACK:** برگشت به آخرین نسخه‌ی PASS (Golden Baseline).

**Scope Freeze:** تا PASS شدن فاز جاری، افزودن فیچر جدید ممنوع.

---

## 4) نام Required Checks (باید دقیقاً همین‌ها باشند)
در Ruleset/Branch Protection، این Status Checkها را Required کنید:

- `LOCKPACK CI / build`
- `LOCKPACK CI / lockpack`
- `(prod) LOCKPACK CI / deploy_prod`

> اگر اسم Checkها تغییر کند یا Required نباشند ⇒ STOP.

---

## 5) خروجی Evidence (ساختار استاندارد)
CI باید artifact ای با این ساختار بسازد:

- `evidence/QG.json`
- `LOCKPACK/HASHLOCK.sha256`
- `snapshot/`  (اسکرین‌شات/ویدئو/گزارش‌ها)
- `evidence/manifest.sha256`  (هش فایل‌ها/باندل)
- `evidence.tgz`
- `evidence.tgz.sig`
- `evidence.tgz.crt`

---

## 6) اجرای امن برای افراد مبتدی (گام‌به‌گام)
### 6.1) قوانین «اشتباه نکن»
- فایل‌ها را داخل “Zip Preview” اجرا نکن. پروژه باید **Extract کامل** شود.
- فقط با Node.js **v20** کار کن.
- هر بار قبل از تست، وضعیت سرویس‌ها را پاک/ریست کن (برای جلوگیری از ارورهای عجیب).
- هر تغییری فقط در یک PR کوچک و قابل rollback انجام شود.

### 6.2) اجرای محلی (Bash / macOS / Linux)
```bash
# 0) پیش‌نیازها: docker + Node.js LTS (مثلاً 22 LTS)
docker --version
node -v

# 1) DB + API
docker compose up -d db

cd apps/api

# Prisma نیاز به DATABASE_URL دارد: فایل .env را از روی نمونه بساز
cp -n .env.example .env || true

npm ci
npm run db:setup
npm run build
# API را در پس‌زمینه اجرا کن
node dist/main.js &
API_PID=$!

# 2) WEB + E2E
cd ../web
npm ci
npm run build
API_BASE_URL=http://127.0.0.1:3001 npm run start &
WEB_PID=$!

# 3) Playwright E2E (Gate: Zero JS Errors)
npm run test:e2e

# 4) Cleanup
kill $WEB_PID || true
kill $API_PID || true
docker compose down -v
```

### 6.3) اجرای محلی (PowerShell / Windows)
```powershell
# ترمینال A (DB)
docker --version
node -v
docker compose up -d db

# ترمینال B (API)
cd apps\api
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm ci
npm run db:setup
npm run build
npm run start

# ترمینال C (WEB)
cd apps\web
npm ci
$env:API_BASE_URL="http://127.0.0.1:3001"
npm run build
npm run start

# ترمینال D (E2E)
cd apps\web
npm run test:e2e

# Cleanup (بعد از اتمام)
cd ..\..
docker compose down -v
```

---

## 7) تنظیمات GitHub (Org/Repo) — چک‌لیست دقیق
### 7.1) Org Ruleset / Branch Protection
- Protected branch: `main`
- Require pull request reviews: ✅ (حداقل 1)
- Require CODEOWNERS review: ✅
- Require status checks: ✅ (سه مورد بخش 4)
- Require conversation resolution: ✅
- Disallow force pushes / deletions: ✅
- Bypass ممنوع (حتی برای admin): ✅

### 7.2) Environments (Protected Prod)
- Environment: `production`
- Required reviewers: ✅
- Deployment branches: فقط `main`/tagهای release
- Secrets محدود و Least Privilege: ✅

---

## 8) QG.json (کیفیت‌گیت) — قرارداد داده
`QG.json` باید حداقل این‌ها را داشته باشد:
- timestamp (UTC)
- commit SHA
- نتایج Gateها (PASS/FAIL/ABORTED/SKIPPED — **PENDING ممنوع در خروجی نهایی**)
- شمارش خطاهای JS (باید 0 باشد)
- مسیر artifact ها + hashها

---

## 9) Golden Baseline
آخرین commit که همه Gateها PASS بوده‌اند، باید به‌عنوان **Golden Baseline** ثبت شود.  
هر ریگرشن نسبت به Baseline ⇒ **STOP + ROLLBACK**.

---

### Meta
- LOCKPACK version: `1.0`
- Updated (UTC): `2025-12-25T21:06:15Z`
