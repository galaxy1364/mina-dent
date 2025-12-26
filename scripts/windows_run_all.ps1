$ErrorActionPreference = "Stop"

function Ensure-Port($port) {
  $ok = (Test-NetConnection 127.0.0.1 -Port $port).TcpTestSucceeded
  return $ok
}

Write-Host "== LOCKPACK: ensure DB =="

cd C:\work\mina-dent_WORK
docker compose up -d db | Out-Null

Write-Host "== LOCKPACK: ensure API on 3001 =="

if (-not (Ensure-Port 3001)) {
  Start-Process powershell -ArgumentList "-NoExit","-Command","cd C:\work\mina-dent_WORK; npm -w apps/api run dev"
  Start-Sleep -Seconds 3
}

if (-not (Ensure-Port 3001)) { throw "API not reachable on 3001" }

Write-Host "== LOCKPACK: ensure WEB on 3000 =="

if (-not (Ensure-Port 3000)) {
  Start-Process powershell -ArgumentList "-NoExit","-Command","cd C:\work\mina-dent_WORK; npm -w apps/web run dev"
  Start-Sleep -Seconds 3
}

if (-not (Ensure-Port 3000)) { throw "WEB not reachable on 3000" }

Write-Host "== LOCKPACK: run E2E =="
cd C:\work\mina-dent_WORK
npm -w apps/web run test:e2e
