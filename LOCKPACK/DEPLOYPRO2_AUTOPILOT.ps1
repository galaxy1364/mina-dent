# LOCKPACK\DEPLOYPRO2_AUTOPILOT.ps1
$ErrorActionPreference="Stop"
function OK($m){Write-Host "PASS  $m" -ForegroundColor Green}
function NO($m){Write-Host "FAIL  $m" -ForegroundColor Red}
function IN($m){Write-Host "INFO  $m" -ForegroundColor Cyan}

$repoRoot=(git rev-parse --show-toplevel 2>$null); if(!$repoRoot){throw "FAIL not in repo"}
Set-Location $repoRoot
OK "repo_root=$repoRoot"

$pin=Join-Path $repoRoot "LOCKPACK\LATEST_DEPLOYPRO2.txt"
if(!(Test-Path $pin)){ throw "FAIL missing $pin" }

$kv=@{}
Get-Content $pin | % { if($_ -match '^\s*([^=]+)=(.*)\s*$'){ $kv[$matches[1].Trim()]=$matches[2].Trim() } }
foreach($k in @("RID","RUN_ID","ENV","ZIP","DIR")){ if(!$kv[$k]){ throw "FAIL pin missing key=$k" } }

$rid=$kv["RID"]; $runId=$kv["RUN_ID"]; $env=$kv["ENV"]; $zip=$kv["ZIP"]; $dir=$kv["DIR"]
OK "RID=$rid"; OK "RUN_ID=$runId"; OK "ENV=$env"; OK "ZIP=$zip"; OK "DIR=$dir"

foreach($p in @(
  (Join-Path $dir "RECEIPT.txt"),
  (Join-Path $dir "pack\evidence\QG.json"),
  (Join-Path $dir "pack\snapshot\LOCKPACK\QG.json"),
  (Join-Path $dir "HASHES.txt"),
  $zip
)){
  if(Test-Path $p){ OK "key_present=$p" } else { throw "FAIL key_missing=$p" }
}

$next=Join-Path $repoRoot "NEXT_STEP_DEPLOYPRO2.txt"
@(
"RID=$rid"
"RUN_ID=$runId"
"ENV=$env"
"ZIP=$zip"
"DIR=$dir"
"QG=$(Join-Path $dir 'pack\evidence\QG.json')"
"SNAPSHOT_QG=$(Join-Path $dir 'pack\snapshot\LOCKPACK\QG.json')"
"HEAD=$(git rev-parse HEAD)"
"BRANCH=$(git rev-parse --abbrev-ref HEAD)"
"UTC=$((Get-Date).ToUniversalTime().ToString('s'))Z"
) -join "`r`n" | Set-Content -Encoding UTF8 $next

OK "wrote=$next"
Get-Content $next | % { Write-Host "PASS  $_" -ForegroundColor Green }
