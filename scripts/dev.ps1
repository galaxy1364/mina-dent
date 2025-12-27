Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Say($msg) { Write-Host "[dev] $msg" }

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Say "Repo: $repoRoot"

# Hard contract: this repo uses npm workspaces (see package.json)
if (-not (Test-Path ".\package.json")) { throw "package.json not found at repo root." }

Say "Installing deps (npm ci)..."
npm ci

Say "Starting dev (npm run dev)..."
npm run dev
