Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say($msg) { Write-Host "[dev] $msg" }

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
Say "Repo: $repoRoot"

# Ensure DB URL for local dev/smoke/lockpack (CI should inject via secrets)
if (-not $env:DATABASE_URL -or [string]::IsNullOrWhiteSpace($env:DATABASE_URL)) {
  $env:DATABASE_URL = "postgresql://mina:mina@localhost:5432/mina_dent?schema=public"
  Say "DATABASE_URL set for this session."
} else {
  Say "DATABASE_URL already set."
}

# Optional: ensure docker compose db is up
if (Get-Command docker -ErrorAction SilentlyContinue) {
  try {
    Say "Ensuring db service is up (docker compose)..."
    docker compose up -d | Out-Null
  } catch {
    Say "docker compose not available or failed; continuing (DB must be reachable)."
  }
}

Say "Installing deps (npm ci)..."
npm ci

Say "Prisma generate/push..."
npm -w apps/api run db:generate
npm -w apps/api run db:push

Say "Quality gates: typecheck/build/smoke/lockpack..."
npm run typecheck
npm run build
npm run ci:smoke
npm run lockpack:refresh

Say "Starting dev..."
npm run dev
