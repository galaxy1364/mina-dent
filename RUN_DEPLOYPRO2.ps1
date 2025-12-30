# RUN_DEPLOYPRO2.ps1 (repo root)
$ErrorActionPreference="Stop"
$repoRoot=(git rev-parse --show-toplevel 2>$null); if(!$repoRoot){throw "FAIL not in repo"}
Set-Location $repoRoot
powershell -ExecutionPolicy Bypass -File ".\LOCKPACK\DEPLOYPRO2_AUTOPILOT.ps1"
