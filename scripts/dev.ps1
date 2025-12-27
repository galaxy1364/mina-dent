Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say($msg) { Write-Host "[dev] $msg" }

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Say "Repo: $repoRoot"

# Detect package manager (pnpm preferred if present)
if (Test-Path ".\pnpm-lock.yaml") {
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw "pnpm not found. Install pnpm or use npm/yarn consistently."
  }
  Say "Installing deps (pnpm)..."
  pnpm -w install --frozen-lockfile
  Say "Starting dev..."
  pnpm -w dev
}
elseif (Test-Path ".\package-lock.json") {
  Say "Installing deps (npm ci)..."
  npm ci
  Say "Starting dev..."
  npm run dev
}
else {
  throw "No lockfile found (pnpm-lock.yaml / package-lock.json). Add one and pin deps."
}
